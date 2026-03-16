import React, { useState, useEffect } from 'react';
import type { Contact, APIResponse } from '../types';

const statusColors: Record<Contact['status'], string> = {
  lead: 'crm-tag-info',
  prospect: 'crm-tag-warning',
  customer: 'crm-tag-success',
  churned: 'crm-tag-danger',
};

export default function ContactList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    status: 'lead' as Contact['status'],
    tags: [] as string[],
    notes: '',
  });

  const fetchContacts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/contacts?${params}`);
      const data: APIResponse<Contact[]> = await response.json();

      if (data.success) {
        setContacts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search, statusFilter]);

  const handleCreate = () => {
    setSelectedContact(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      title: '',
      status: 'lead',
      tags: [],
      notes: '',
    });
    setShowModal(true);
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      company: contact.company || '',
      title: contact.title || '',
      status: contact.status,
      tags: contact.tags,
      notes: contact.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      setContacts(contacts.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = selectedContact
        ? `/api/contacts/${selectedContact.id}`
        : '/api/contacts';
      const method = selectedContact ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data: APIResponse<Contact> = await response.json();

      if (data.success && data.data) {
        if (selectedContact) {
          setContacts(contacts.map(c => c.id === data.data!.id ? data.data! : c));
        } else {
          setContacts([data.data, ...contacts]);
        }
        setShowModal(false);
      }
    } catch (error) {
      console.error('Failed to save contact:', error);
    }
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
          <h2 className="text-2xl font-bold">Contacts</h2>
          <p className="text-gray-400">{contacts.length} total contacts</p>
        </div>
        <button onClick={handleCreate} className="crm-btn crm-btn-primary">
          + Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="crm-input"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="crm-input w-48"
        >
          <option value="">All Statuses</option>
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="customer">Customer</option>
          <option value="churned">Churned</option>
        </select>
      </div>

      {/* Contact Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Email</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Company</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">
                  No contacts found
                </td>
              </tr>
            ) : (
              contacts.map(contact => (
                <tr key={contact.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      {contact.title && (
                        <p className="text-sm text-gray-400">{contact.title}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{contact.email}</td>
                  <td className="px-4 py-3 text-gray-300">{contact.company || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`crm-tag ${statusColors[contact.status]}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800/50 text-red-400 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="crm-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">
              {selectedContact ? 'Edit Contact' : 'Add Contact'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="crm-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="crm-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="crm-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Contact['status'] })}
                    className="crm-input"
                  >
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="customer">Customer</option>
                    <option value="churned">Churned</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="crm-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="crm-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="crm-input h-24 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="crm-btn crm-btn-primary flex-1">
                  {selectedContact ? 'Update' : 'Create'}
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
