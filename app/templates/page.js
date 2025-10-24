'use client';

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in again');
        router.push('/login');
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
        alert(data.message || 'Failed to generate quests');
        return;
      }

      if (data.questsCreated === 0) {
        alert('No new quests to generate. Templates may have already generated quests recently based on their schedule.');
      } else {
        alert(`Successfully generated ${data.questsCreated} quests! Check your dashboard to complete them.`);
      }
    } catch (error) {
      console.error('Error generating quests:', error);
      alert('Failed to generate quests');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Recurring Quest Templates</h1>
            <p className="text-gray-300">Create templates that auto-generate quests daily, weekly, or on custom schedules</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
              Back to Dashboard
            </button>
            <button
              onClick={generateQuestsNow}
              disabled={generating || templates.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Generate Quests Now'}
            </button>
            <button onClick={openCreateModal} className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-semibold">
              Create Template
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold">{template.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${template.is_active ? 'bg-green-600' : 'bg-gray-600'}`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-gray-400 mt-2">{template.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Recurrence: {template.recurrence_type === 'custom'
                      ? `Every ${template.recurrence_interval} days`
                      : template.recurrence_type.charAt(0).toUpperCase() + template.recurrence_type.slice(1)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleTemplate(template.id, template.is_active)}
                    className={`px-4 py-2 rounded-lg font-semibold ${template.is_active ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {template.is_active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Tasks in this template */}
              <div className="mt-4">
                <h4 className="font-semibold mb-2 text-gray-300">Tasks ({template.tasks.length}):</h4>
                <div className="space-y-2">
                  {template.tasks.map((task, idx) => (
                    <div key={task.id} className="bg-gray-700/50 p-3 rounded-lg flex items-center gap-3">
                      <span className="text-gray-400">{idx + 1}.</span>
                      <span className="flex-1">{task.task_text}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        task.difficulty === 'easy' ? 'bg-green-600' :
                        task.difficulty === 'medium' ? 'bg-yellow-600' :
                        'bg-red-600'
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
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
              <h3 className="text-2xl font-bold mb-4">No Templates Yet</h3>
              <p className="text-gray-400 mb-6">Create your first recurring quest template to automate your daily or weekly tasks!</p>
              <button onClick={openCreateModal} className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-semibold">
                Create Your First Template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{editingTemplate ? 'Edit Template' : 'Create New Template'}</h2>

            {/* Template Name */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Morning Routine, Weekly Review"
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Description (optional)</label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe this template..."
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={2}
              />
            </div>

            {/* Recurrence Type */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Recurrence</label>
                <select
                  value={recurrenceType}
                  onChange={(e) => setRecurrenceType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {recurrenceType === 'custom' && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Every X Days</label>
                  <input
                    type="number"
                    min="1"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Tasks</label>
              <div className="space-y-3">
                {tasks.map((task, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={task.text}
                      onChange={(e) => updateTask(idx, 'text', e.target.value)}
                      placeholder="Task description..."
                      className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <select
                      value={task.difficulty}
                      onChange={(e) => updateTask(idx, 'difficulty', e.target.value)}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    {tasks.length > 1 && (
                      <button
                        onClick={() => removeTask(idx)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addTask}
                className="mt-3 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm"
              >
                + Add Another Task
              </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-semibold"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
