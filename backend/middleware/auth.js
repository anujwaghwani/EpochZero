const { createClient } = require('@supabase/supabase-js');

// Use the Service Role Key for backend administration tasks and token verification
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Express middleware to enforce authentication and attach profile data
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token using Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token', details: authError?.message });
    }

    // Fetch the corresponding profile data based on the authenticated user's ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, departments!profiles_department_id_fkey(name)')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profile) {
      return res.status(403).json({ error: 'User profile not found', details: profileError?.message });
    }

    // Attach both user identity and role-based profile data to the request
    req.user = user;
    req.profile = profile;
    
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = requireAuth;
