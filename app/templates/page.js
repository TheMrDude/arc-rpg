'use client';
import GlobalFooter from '@/app/components/GlobalFooter';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TemplatesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [tasks, setTasks] = useState([{ text: '', difficulty: 'medium' }]);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Check if user is premium
      if (profileData.subscription_status !== 'active') {
        router.push('/dashboard');
        return;
      }

      loadTemplates();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/recurring-templates', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  function openCreateModal() {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setRecurrenceType('daily');
    setRecurrenceInterval(1);
    setTasks([{ text: '', difficulty: 'medium' }]);
    setShowCreateModal(true);
  }

  function openEditModal(template) {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setRecurrenceType(template.recurrence_type);
    setRecurrenceInterval(template.recurrence_interval);
    setTasks(template.tasks.map(t => ({ text: t.task_text, difficulty: t.difficulty })));
    setShowCreateModal(true);
  }

  function addTask() {
    setTasks([...tasks, { text: '', difficulty: 'medium' }]);
  }

  function removeTask(index) {
    setTasks(tasks.filter((_, i) => i !== index));
  }

  function updateTask(index, field, value) {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  }

  async function saveTemplate() {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const validTasks = tasks.filter(t => t.text.trim());
    if (validTasks.length === 0) {
      alert('Please add at least one task');
      return;
    }

    try {
      // Get auth token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in again');
        router.push('/login');
        return;
      }

      // Convert tasks to match API format
      const formattedTasks = validTasks.map(t => ({
        task_text: t.text,
        difficulty: t.difficulty
      }));

      const body = {
        name: templateName,
        description: templateDescription,
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceInterval,
        tasks: formattedTasks,
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      if (editingTemplate) {
        // Update existing template
        const response = await fetch('/api/recurring-templates', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ ...body, template_id: editingTemplate.id }),
        });

        if (!response.ok) throw new Error('Failed to update template');
      } else {
        // Create new template
        const response = await fetch('/api/recurring-templates', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error('Failed to create template');
      }

      setShowCreateModal(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  }

  async function deleteTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in again');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/recurring-templates', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ template_id: templateId }),
      });

      if (!response.ok) throw new Error('Failed to delete template');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  }

  async function toggleTemplate(templateId, isActive) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in again');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/recurring-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ template_id: templateId, is_active: !isActive }),
      });

      if (!response.ok) throw new Error('Failed to update template');
      loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
    }
  }

  async function generateQuestsNow() {
    if (generating) return;

    setGenerating(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session || !session.access_token) {
        console.error('Session error:', sessionError);
        alert('Session expired. Please log in again.');
        router.push('/login');
        setGenerating(false);
        return;
      }

      const response = await fetch('/api/generate-from-templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Generate from templates error:', data);
        alert(data.message || data.error || 'Failed to generate quests');
        setGenerating(false);
        return;
      }

      if (data.questsCreated === 0) {
        alert('No new quests to generate. Templates may have already generated quests recently based on their schedule.');
      } else {
        alert(`Successfully generated ${data.questsCreated} quests! Check your dashboard to complete them.`);
      }
    } catch (error) {
      console.error('Error generating quests:', error);
      alert(`Failed to generate quests: ${error.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="kidquest min-h-screen bg-cream text-navy p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="kq-display text-4xl font-bold mb-2 text-navy">Recurring Quest Templates</h1>
            <p className="text-navy/60">Create templates that auto-generate quests daily, weekly, or on custom schedules</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.push('/dashboard')} className="kq-btn kq-btn-ghost">
              Back to Dashboard
            </button>
            <button
              onClick={generateQuestsNow}
              disabled={generating || templates.length === 0}
              className="kq-btn kq-btn-emerald disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Generate Quests Now'}
            </button>
            <button onClick={openCreateModal} className="kq-btn kq-btn-gold">
              Create Template
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="kq-card p-6">
              <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-navy">{template.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${template.is_active ? 'bg-emerald/15 text-emerald' : 'bg-navy/10 text-navy/60'}`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-navy/60 mt-2">{template.description}</p>
                  )}
                  <p className="text-sm text-navy/50 mt-2">
                    Recurrence: {template.recurrence_type === 'custom'
                      ? `Every ${template.recurrence_interval} days`
                      : template.recurrence_type.charAt(0).toUpperCase() + template.recurrence_type.slice(1)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleTemplate(template.id, template.is_active)}
                    className={`kq-btn ${template.is_active ? 'kq-btn-ghost' : 'kq-btn-emerald'}`}
                  >
                    {template.is_active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="kq-btn kq-btn-blue"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="kq-btn bg-coral/12 border-2 border-coral text-coral hover:bg-coral/20"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Tasks in this template */}
              <div className="mt-4">
                <h4 className="font-semibold mb-2 text-navy/70">Tasks ({template.tasks.length}):</h4>
                <div className="space-y-2">
                  {template.tasks.map((task, idx) => (
                    <div key={task.id} className="bg-cream p-3 rounded-candy flex items-center gap-3">
                      <span className="text-navy/50">{idx + 1}.</span>
                      <span className="flex-1 text-navy">{task.task_text}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        task.difficulty === 'easy' ? 'bg-emerald/15 text-emerald' :
                        task.difficulty === 'medium' ? 'bg-gold/20 text-gold' :
                        'bg-coral/15 text-coral'
                      }`}>
                        {task.difficulty.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="kq-card p-12 text-center">
              <h3 className="kq-display text-2xl font-bold mb-4 text-navy">No Templates Yet</h3>
              <p className="text-navy/60 mb-6">Create your first recurring quest template to automate your daily or weekly tasks!</p>
              <button onClick={openCreateModal} className="kq-btn kq-btn-gold">
                Create Your First Template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-navy/60 flex items-center justify-center p-4 z-50">
          <div className="kq-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="kq-display text-2xl font-bold mb-6 text-navy">{editingTemplate ? 'Edit Template' : 'Create New Template'}</h2>

            {/* Template Name */}
            <div className="mb-4">
              <label className="kq-label">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Morning Routine, Weekly Review"
                className="kq-input w-full"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="kq-label">Description (optional)</label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe this template..."
                className="kq-input w-full"
                rows={2}
              />
            </div>

            {/* Recurrence Type */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="kq-label">Recurrence</label>
                <select
                  value={recurrenceType}
                  onChange={(e) => setRecurrenceType(e.target.value)}
                  className="kq-input w-full"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {recurrenceType === 'custom' && (
                <div>
                  <label className="kq-label">Every X Days</label>
                  <input
                    type="number"
                    min="1"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(parseInt(e.target.value))}
                    className="kq-input w-full"
                  />
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="mb-6">
              <label className="kq-label">Tasks</label>
              <div className="space-y-3">
                {tasks.map((task, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={task.text}
                      onChange={(e) => updateTask(idx, 'text', e.target.value)}
                      placeholder="Task description..."
                      className="kq-input flex-1"
                    />
                    <select
                      value={task.difficulty}
                      onChange={(e) => updateTask(idx, 'difficulty', e.target.value)}
                      className="kq-input"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    {tasks.length > 1 && (
                      <button
                        onClick={() => removeTask(idx)}
                        className="kq-btn bg-coral/12 border-2 border-coral text-coral hover:bg-coral/20"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addTask}
                className="mt-3 kq-btn kq-btn-ghost text-sm"
              >
                + Add Another Task
              </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="kq-btn kq-btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                className="kq-btn kq-btn-gold"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
      <GlobalFooter />
    </div>
  );
}
