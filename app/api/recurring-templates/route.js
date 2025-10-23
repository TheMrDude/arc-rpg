import { NextResponse } from 'next/server';
import { authenticateRequest, checkPremiumStatus, getSupabaseAdmin } from '@/lib/api-auth';

const supabaseAdmin = getSupabaseAdmin();

// GET - List user's recurring quest templates
export async function GET(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is premium
    const { isPremium, error: premiumError } = await checkPremiumStatus(user.id);
    if (premiumError) {
      return NextResponse.json({ error: 'Failed to verify premium status' }, { status: 500 });
    }

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

    return NextResponse.json({ templates: templates || [] });

  } catch (error) {
    console.error('Templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new recurring quest template
export async function POST(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is premium
    const { isPremium, error: premiumError } = await checkPremiumStatus(user.id);
    if (premiumError) {
      return NextResponse.json({ error: 'Failed to verify premium status' }, { status: 500 });
    }

    if (!isPremium) {
      return NextResponse.json({
        error: 'Premium feature',
        message: 'Recurring quest templates are a premium feature'
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
      return NextResponse.json({ error: 'Failed to create template', details: templateError.message }, { status: 500 });
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
      return NextResponse.json({ error: 'Failed to create template tasks', details: tasksError.message }, { status: 500 });
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

    console.log('Template created successfully:', { userId: user.id, templateId: template.id });

    return NextResponse.json({ template: completeTemplate }, { status: 201 });

  } catch (error) {
    console.error('Templates POST error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// PUT - Update a template
export async function PUT(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { template_id, name, description, recurrence_type, recurrence_interval, is_active, tasks } = body;

    if (!template_id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    // Build update object
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (recurrence_type !== undefined) updates.recurrence_type = recurrence_type;
    if (recurrence_interval !== undefined) updates.recurrence_interval = recurrence_interval;
    if (is_active !== undefined) updates.is_active = is_active;
    updates.updated_at = new Date().toISOString();

    // Update template
    const { error: updateError } = await supabaseAdmin
      .from('recurring_quest_templates')
      .update(updates)
      .eq('id', template_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating template:', updateError);
      return NextResponse.json({ error: 'Failed to update template', details: updateError.message }, { status: 500 });
    }

    // If tasks provided, update them
    if (tasks) {
      // Delete existing tasks
      await supabaseAdmin
        .from('template_tasks')
        .delete()
        .eq('template_id', template_id);

      // Insert new tasks
      const taskInserts = tasks.map((task, index) => ({
        template_id,
        task_text: task.task_text.trim(),
        difficulty: task.difficulty,
        sort_order: index,
      }));

      const { error: tasksError } = await supabaseAdmin
        .from('template_tasks')
        .insert(taskInserts);

      if (tasksError) {
        console.error('Error updating tasks:', tasksError);
        return NextResponse.json({ error: 'Failed to update tasks', details: tasksError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Templates PUT error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// DELETE - Delete a template
export async function DELETE(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { template_id } = await request.json();

    if (!template_id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    // Verify template belongs to user and delete
    const { error } = await supabaseAdmin
      .from('recurring_quest_templates')
      .delete()
      .eq('id', template_id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Templates DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
