import React, { useState, useEffect } from 'react';
import type { Deal, Contact, APIResponse } from '../types';

interface PipelineColumn {
  id: string;
  title: string;
  stages: string[];
  color: string;
}

const pipelineColumns: PipelineColumn[] = [
  { id: 'early', title: 'Early Stage', stages: ['discovery', 'qualification'], color: 'border-blue-500' },
  { id: 'middle', title: 'Middle Stage', stages: ['proposal'], color: 'border-yellow-500' },
  { id: 'late', title: 'Late Stage', stages: ['negotiation'], color: 'border-purple-500' },
  { id: 'closed', title: 'Closed', stages: ['closed_won', 'closed_lost'], color: 'border-green-500' },
];

const stageLabels: Record<string, string> = {
  discovery: 'Discovery',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Won',
  closed_lost: 'Lost',
};

export default function DealPipeline() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    contactId: '',
    value: 0,
    currency: 'USD',
    stage: 'discovery' as Deal['stage'],
    probability: 10,
    expectedCloseDate: '',
    description: '',
  });

  const fetchData = async () => {
    try {
      const [dealsRes, contactsRes] = await Promise.all([
        fetch('/api/deals'),
        fetch('/api/contacts'),
      ]);

      const dealsData: APIResponse<Deal[]> = await dealsRes.json();
      const contactsData: APIResponse<Contact[]> = await contactsRes.json();

      if (dealsData.success) setDeals(dealsData.data || []);
      if (contactsData.success) setContacts(contactsData.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setSelectedDeal(null);
    setFormData({
      title: '',
      contactId: '',
      value: 0,
      currency: 'USD',
      stage: 'discovery',
      probability: 10,
      expectedCloseDate: '',
      description: '',
    });
    setShowModal(true);
  };

  const handleEdit = (deal: Deal) => {
    setSelectedDeal(deal);
    setFormData({
      title: deal.title,
      contactId: deal.contactId,
      value: deal.value,
      currency: deal.currency,
      stage: deal.stage,
      probability: deal.probability,
      expectedCloseDate: deal.expectedCloseDate || '',
      description: deal.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = selectedDeal ? `/api/deals/${selectedDeal.id}` : '/api/deals';
      const method = selectedDeal ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data: APIResponse<Deal> = await response.json();

      if (data.success && data.data) {
        if (selectedDeal) {
          setDeals(deals.map(d => d.id === data.data!.id ? data.data! : d));
        } else {
          setDeals([...deals, data.data]);
        }
        setShowModal(false);
      }
    } catch (error) {
      console.error('Failed to save deal:', error);
    }
  };

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStage: Deal['stage']) => {
    e.preventDefault();
    if (!draggedDeal || draggedDeal.stage === newStage) {
      setDraggedDeal(null);
      return;
    }

    try {
      const response = await fetch(`/api/deals/${draggedDeal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draggedDeal, stage: newStage }),
      });

      const data: APIResponse<Deal> = await response.json();

      if (data.success && data.data) {
        setDeals(deals.map(d => d.id === data.data!.id ? data.data! : d));
      }
    } catch (error) {
      console.error('Failed to update deal stage:', error);
    } finally {
      setDraggedDeal(null);
    }
  };

  const getContactName = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact?.name || 'Unknown';
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getDealsByStage = (stage: string) => {
    return deals.filter(d => d.stage === stage);
  };

  const getColumnTotal = (column: PipelineColumn) => {
    return column.stages.reduce((sum, stage) => {
      return sum + getDealsByStage(stage).reduce((s, d) => s + d.value, 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="crm-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deal Pipeline</h2>
          <p className="text-gray-400">
            Total Pipeline: {formatCurrency(deals.reduce((sum, d) => sum + d.value, 0))}
          </p>
        </div>
        <button onClick={handleCreate} className="crm-btn crm-btn-primary">
          + Add Deal
        </button>
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto">
        {pipelineColumns.map(column => (
          <div key={column.id} className="pipeline-column">
            <div className={`border-t-4 ${column.color} rounded-t-lg pt-3 mb-3`}>
              <div className="flex items-center justify-between px-2">
                <h3 className="font-semibold">{column.title}</h3>
                <span className="text-sm text-gray-400">
                  {formatCurrency(getColumnTotal(column))}
                </span>
              </div>
            </div>

            {column.stages.map(stage => (
              <div
                key={stage}
                className="mb-4"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage as Deal['stage'])}
              >
                <div className="flex items-center gap-2 mb-2 px-2">
                  <span className="text-sm text-gray-400">{stageLabels[stage]}</span>
                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">
                    {getDealsByStage(stage).length}
                  </span>
                </div>

                <div className="space-y-2">
                  {getDealsByStage(stage).map(deal => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={() => handleDragStart(deal)}
                      onClick={() => handleEdit(deal)}
                      className={`pipeline-card ${
                        draggedDeal?.id === deal.id ? 'dragging' : ''
                      }`}
                    >
                      <h4 className="font-medium mb-2">{deal.title}</h4>
                      <p className="text-sm text-gray-400 mb-2">
                        {getContactName(deal.contactId)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-green-400">
                          {formatCurrency(deal.value, deal.currency)}
                        </span>
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                          {deal.probability}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="crm-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="crm-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">
              {selectedDeal ? 'Edit Deal' : 'Add Deal'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="crm-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Contact
                  </label>
                  <select
                    value={formData.contactId}
                    onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                    className="crm-input"
                  >
                    <option value="">Select contact...</option>
                    {contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} ({contact.company || 'No company'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as Deal['stage'] })}
                    className="crm-input"
                  >
                    {Object.entries(stageLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Value *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                    className="crm-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="crm-input"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                    className="crm-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  className="crm-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="crm-input h-24 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="crm-btn crm-btn-primary flex-1">
                  {selectedDeal ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="crm-btn crm-btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
