SELECT proname, prosrc FROM pg_proc WHERE proname IN ('is_any_farm_member','is_platform_admin') AND pronamespace = 'public'::regnamespace;
