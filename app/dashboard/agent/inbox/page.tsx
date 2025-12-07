'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { CRMService, Lead, LeadMessage, WhatsAppTemplate } from '@/lib/crm.service'

export default function AgentInboxPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [messages, setMessages] = useState<LeadMessage[]>([])
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  })
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadLeads()
      loadTemplates()
    }
  }, [user, filters])

  useEffect(() => {
    if (selectedLead) {
      loadMessages(selectedLead.id)
    }
  }, [selectedLead])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is agent
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'agent') {
      router.push('/forbidden')
      return
    }

    setUser(user)
  }

  const loadLeads = async () => {
    try {
      const { leads: leadsData } = await CRMService.getLeads({
        agent_id: user.id,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        limit: 100
      })

      // Filter by search term
      const filteredLeads = filters.search
        ? leadsData.filter(lead =>
            lead.user_name.toLowerCase().includes(filters.search.toLowerCase()) ||
            lead.user_phone.includes(filters.search) ||
            (lead.message && lead.message.toLowerCase().includes(filters.search.toLowerCase()))
          )
        : leadsData

      setLeads(filteredLeads)

      // Auto-select first lead if none selected
      if (!selectedLead && filteredLeads.length > 0) {
        setSelectedLead(filteredLeads[0])
      }
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (leadId: string) => {
    try {
      const messagesData = await CRMService.getLeadMessages(leadId)
      setMessages(messagesData)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      const templatesData = await CRMService.getTemplates()
      setTemplates(templatesData)
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedLead || (!newMessage.trim() && !selectedTemplate)) return

    setSending(true)
    try {
      let messageToSend = newMessage.trim()

      // If template selected, use template
      if (selectedTemplate) {
        const template = templates.find(t => t.id === selectedTemplate)
        if (template) {
          messageToSend = template.template_text
          // Simple variable replacement (would be more sophisticated)
          template.variables_json.forEach(varName => {
            messageToSend = messageToSend.replace(`{{${varName}}}`, `[${varName}]`)
          })
        }
      }

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          message: messageToSend,
          template_id: selectedTemplate || undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message')
      }

      // Reload messages
      await loadMessages(selectedLead.id)
      setNewMessage('')
      setSelectedTemplate('')

      alert('Pesan berhasil dikirim!')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Gagal mengirim pesan. Silakan coba lagi.')
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      await CRMService.updateLead(leadId, { status: newStatus })
      await loadLeads()

      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      alert('Gagal mengupdate status lead')
    }
  }

  const handleAddNote = async (leadId: string, note: string) => {
    try {
      await CRMService.addNote({
        lead_id: leadId,
        author_id: user.id,
        note: note,
        note_type: 'general',
        is_private: false
      })
      alert('Catatan berhasil ditambahkan!')
    } catch (error) {
      console.error('Error adding note:', error)
      alert('Gagal menambahkan catatan')
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-purple-100 text-purple-800',
      not_interested: 'bg-gray-100 text-gray-800',
      converted: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-red-100 text-red-800'
    }
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inbox Agent</h1>
              <p className="text-gray-600 mt-2">Kelola leads dan percakapan WhatsApp Anda</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                🟢 Online
              </div>
              <button
                onClick={() => router.push('/dashboard/agent')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                ← Kembali ke Dashboard
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Leads List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Leads ({leads.length})</h2>

                {/* Filters */}
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Cari nama, nomor, atau pesan..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Semua Status</option>
                      <option value="new">Baru</option>
                      <option value="contacted">Dihubungi</option>
                      <option value="qualified">Qualified</option>
                      <option value="converted">Converted</option>
                    </select>

                    <select
                      value={filters.priority}
                      onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Semua Prioritas</option>
                      <option value="high">Tinggi</option>
                      <option value="normal">Normal</option>
                      <option value="low">Rendah</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {leads.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada leads</h3>
                    <p className="mt-1 text-sm text-gray-500">Leads baru akan muncul di sini</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {leads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedLead?.id === lead.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {lead.user_name}
                          </h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(lead.priority)}`}>
                            {lead.priority}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-2 truncate">
                          {lead.message || 'Tanpa pesan'}
                        </p>

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            {formatTime(lead.created_at)}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            {selectedLead ? (
              <div className="bg-white rounded-lg shadow overflow-hidden h-[600px] flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedLead.user_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedLead.user_phone} • {selectedLead.source}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedLead.status}
                        onChange={(e) => handleStatusChange(selectedLead.id, e.target.value as Lead['status'])}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="new">Baru</option>
                        <option value="contacted">Dihubungi</option>
                        <option value="qualified">Qualified</option>
                        <option value="not_interested">Tidak Tertarik</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                      <button
                        onClick={() => {
                          const note = prompt('Tambahkan catatan:')
                          if (note) handleAddNote(selectedLead.id, note)
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        + Catatan
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.from_role === 'agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.from_role === 'agent'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.from_role === 'agent' ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          {formatTime(message.created_at)}
                          {message.status !== 'sent' && (
                            <span className="ml-2">
                              {message.status === 'delivered' ? '✓✓' : message.status === 'read' ? '✓✓' : '❌'}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  {/* Template Selector */}
                  <div className="mb-3">
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Pilih template (opsional)</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ketik pesan Anda..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={sending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || (!newMessage.trim() && !selectedTemplate)}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                    >
                      {sending ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        'Kirim'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Pilih Lead</h3>
                <p className="mt-2 text-gray-500">Pilih lead dari daftar untuk mulai percakapan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}