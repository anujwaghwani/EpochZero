require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Auth Middleware to protect backend routes
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  req.user = user;
  req.profile = profile;
  next();
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name, role, department_id } = req.body;
    console.log(`[REGISTER] Creating user: ${email} as ${role}`);
    
    // 1. Create user in auth.users using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });
    if (authError) throw authError;

    // 2. Insert into profiles (using upsert to prevent unique constraint errors if a Postgres trigger is still active)
    console.log(`[REGISTER] Upserting profile for ${authData.user.id}`);
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      full_name,
      role: role || 'employee',
      department_id: department_id || null
    });
    
    if (profileError) {
      // Rollback user creation if profile insertion fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    res.json({ message: 'Registered successfully' });
  } catch (err) {
    console.error('[REGISTER ERROR]', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/departments', async (req, res) => {
  try {
    console.log('[DEPARTMENTS] Fetching bypass list');
    const { data, error } = await supabase.from('departments').select('id, name').order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[DEPARTMENTS ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/expenses', requireAuth, async (req, res) => {
  try {
    console.log(`[EXPENSES] Fetching for role: ${req.profile.role}`);
    let query = supabase.from('expenses').select('*, profiles(full_name), approval_logs(comments, action)').order('created_at', { ascending: false });
    
    if (req.profile.role === 'employee') {
      query = query.eq('user_id', req.user.id);
    } else if (req.profile.role === 'manager') {
      query = query.eq('department_id', req.profile.department_id || '00000000-0000-0000-0000-000000000000').eq('status', 'pending');
    }
    
    const { data, error } = await query;
    if (error) throw error;

    // Smart Auditing for Managers
    let enrichedData = data;
    if (req.profile.role === 'manager' || req.profile.role === 'finance') {
      enrichedData = await Promise.all(data.map(async (exp) => {
        let flags = [];
        if (exp.amount > 500) flags.push('high_value');
        
        // Duplicate check (last 7 days, same user, same amount)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: pastExps } = await supabase.from('expenses')
          .select('id')
          .eq('user_id', exp.user_id)
          .eq('amount', exp.amount)
          .gte('created_at', sevenDaysAgo.toISOString())
          .neq('id', exp.id)
          .limit(1);
          
        if (pastExps && pastExps.length > 0) flags.push('duplicate_warning');
        return { ...exp, flags };
      }));
    }
    
    res.json(enrichedData);
  } catch (err) {
    console.error('[EXPENSES GET ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', requireAuth, async (req, res) => {
  try {
    const { amount, description, receipt_url } = req.body;
    console.log(`[EXPENSES] Creating new expense for $${amount}`);
    
    const { data, error } = await supabase.from('expenses').insert({
      user_id: req.user.id,
      department_id: req.profile.department_id,
      amount: parseFloat(amount),
      description,
      receipt_url: receipt_url || null,
      status: 'pending'
    }).select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error('[EXPENSES POST ERROR]', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/expenses/:id/approve', requireAuth, async (req, res) => {
  try {
    if (req.profile.role !== 'manager' && req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const expenseId = req.params.id;
    console.log(`[APPROVE] Approving expense: ${expenseId}`);
    
    // 1. Fetch expense details
    const { data: expense, error: expError } = await supabase.from('expenses').select('*').eq('id', expenseId).single();
    if (expError) throw expError;

    // 2. Query budget to check if it's on hold
    const { data: budget, error: budgetError } = await supabase.from('budgets').select('*').eq('department_id', expense.department_id).eq('is_active', true).single();
    if (budgetError) throw budgetError;

    // Note: The schema might use is_active = false or a custom status field. Checking both.
    if (budget.status === 'on_hold' || budget.is_active === false) {
      return res.status(403).json({ error: 'Budget is currently frozen/on hold. Approvals disabled.' });
    }

    // 3. Perform the transaction updates manually via Express logic
    await supabase.from('expenses').update({ status: 'approved' }).eq('id', expenseId);
    await supabase.from('budgets').update({ total_spent: Number(budget.total_spent) + Number(expense.amount) }).eq('id', budget.id);
    
    await supabase.from('approval_logs').insert({
      expense_id: expenseId,
      approver_id: req.user.id,
      action: 'approved',
      comments: req.body.comments || 'Approved via Backend API'
    });

    res.json({ message: 'Expense successfully approved and budget updated.' });
  } catch (err) {
    console.error('[APPROVE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/expenses/:id/reject', requireAuth, async (req, res) => {
  try {
    if (req.profile.role !== 'manager' && req.profile.role !== 'finance') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const expenseId = req.params.id;
    const { reason } = req.body;
    console.log(`[REJECT] Rejecting expense: ${expenseId}`);
    
    // Update expense
    await supabase.from('expenses').update({ status: 'rejected' }).eq('id', expenseId);
    
    // Log
    await supabase.from('approval_logs').insert({
      expense_id: expenseId,
      approver_id: req.user.id,
      action: 'rejected',
      comments: reason || 'No reason provided'
    });

    res.json({ message: 'Expense rejected.' });
  } catch (err) {
    console.error('[REJECT ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`Backend running instantly on http://localhost:${port}`));
}

// Export for Vercel Serverless
module.exports = app;
