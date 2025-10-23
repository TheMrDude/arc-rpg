import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - List user's recurring quest templates
export async function GET(request) {
  try {
    // Authenticate user
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is premium
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_status === 'active';

    if (!isPremium) {
      return NextResponse.json({
        error: 'Premium feature',
        message: 'Recurring quest templates are a premium feature'
      }, { status: 403 });
    }

    // Get user's templates with tasks
    const { data: templates, error } = await supabaseAdmin
      .from('recurring_quest_templates')
      .select(`
        *,
        tasks:template_tasks(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates });

  } catch (error) {
    console.error('Templates GET error:', {
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new recurring quest template
export async function POST(request) {
  try {
    // Try Authorization header first, then cookies
    const authHeader = request.headers.get('Authorization');
    let user = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data.user) {
        user = data.user;
      }
    }

    // Fallback to cookie-based auth if no header
    if (!user) {
      const cookieStore = cookies();
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value;
            },
          },
        }
      );

      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && cookieUser) {
        user = cookieUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is premium
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to verify premium status' }, { status: 500 });
    }

    const isPremium = profile?.subscription_status === 'active';

    if (!isPremium) {
      return NextResponse.json({
        error: 'Premium feature',
        message: 'Recurring quest templates are a premium feature. Upgrade to premium!'
      }, { status: 403 });
    }

    const { name, description, recurrence_type, recurrence_interval, tasks } = await request.json();

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    if (!recurrence_type || !['daily', 'weekly', 'custom'].includes(recurrence_type)) {
      return NextResponse.json({ error: 'Invalid recurrence type' }, { status: 400 });
    }

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: 'At least one task is required' }, { status: 400 });
    }

    // Validate tasks
    for (const task of tasks) {
      if (!task.task_text || !task.task_text.trim()) {
        return NextResponse.json({ error: 'Task text cannot be empty' }, { status: 400 });
      }
      if (!task.difficulty || !['easy', 'medium', 'hard'].includes(task.difficulty)) {
        return NextResponse.json({ error: 'Invalid task difficulty' }, { status: 400 });
      }
    }

    // Create template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('recurring_quest_templates')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        recurrence_type,
        recurrence_interval: recurrence_type === 'custom' ? recurrence_interval : 1,
        is_active: true,
      })
      .select()
      .single();

    if (templateError) {
      console.error('Error creating template:', templateError);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    // Create template tasks
    const taskInserts = tasks.map((task, index) => ({
      template_id: template.id,
      task_text: task.task_text.trim(),
      difficulty: task.difficulty,
      sort_order: index,
    }));

    const { error: tasksError } = await supabaseAdmin
      .from('template_tasks')
      .insert(taskInserts);

    if (tasksError) {
      console.error('Error creating template tasks:', tasksError);
      // Rollback - delete the template
      await supabaseAdmin
        .from('recurring_quest_templates')
        .delete()
        .eq('id', template.id);
      return NextResponse.json({ error: 'Failed to create template tasks' }, { status: 500 });
    }

    // Fetch complete template with tasks
    const { data: completeTemplate } = await supabaseAdmin
      .from('recurring_quest_templates')
      .select(`
        *,
        tasks:template_tasks(*)
      `)
      .eq('id', template.id)
      .single();

    console.log('Template created successfully', {
      userId: user.id,
      templateId: template.id,
      taskCount: tasks.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ template: completeTemplate }, { status: 201 });

  } catch (error) {
    console.error('Templates POST error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a template
export async function DELETE(request) {
  try {
    // Authenticate user
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    // Verify template belongs to user and delete
    const { error } = await supabaseAdmin
      .from('recurring_quest_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Templates DELETE error:', {
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
