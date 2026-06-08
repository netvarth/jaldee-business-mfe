import React, { useState } from 'react';
import { CrmLeadDto } from '../../types';
import { mockChannels, mockProducts, mockPipelines, mockLeads } from '../../mockData';
import { Button, Input, Select, Dialog, DialogFooter, RadioGroup } from '@jaldee/design-system';

interface CreateLeadModalProps {
  onClose: () => void;
  onSave: (lead: CrmLeadDto) => void;
}

export default function CreateLeadModal({ onClose, onSave }: CreateLeadModalProps) {
  const [formData, setFormData] = useState<Partial<CrmLeadDto>>({
    consumerFirstName: '',
    consumerLastName: '',
    consumerPhone: '',
    consumerEmail: '',
    channelUid: '',
    productUid: '',
    priority: 'NORMAL'
  });

  const isDuplicate = React.useMemo(() => {
    return formData.consumerPhone && formData.consumerPhone.length > 5 && mockLeads.some(l => l.consumerPhone === formData.consumerPhone && l.internalStatus === 'ACTIVE');
  }, [formData.consumerPhone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consumerFirstName || !formData.consumerPhone || !formData.productUid) return;

    const prod = mockProducts.find(p=>p.uid === formData.productUid);
    const chan = mockChannels.find(c=>c.uid === formData.channelUid);
    const pipe = mockPipelines.find(p=>p.uid === prod?.defaultPipelineUid) || mockPipelines[0];

    const newLead: CrmLeadDto = {
      uid: 'L-' + Date.now().toString(),
      referenceNo: 'REF-NEW',
      leadDate: new Date().toISOString(),
      channelUid: formData.channelUid || '',
      channelName: chan?.name || 'Unknown',
      channelType: chan?.channelType || 'DIRECT',
      productUid: formData.productUid,
      productName: prod?.name || '',
      productEnum: prod?.productEnum || '',
      pipelineUid: pipe.uid,
      pipelineName: pipe.name,
      currentPipelineStageUid: pipe.stages[0].uid,
      currentPipelineStageName: pipe.stages[0].stageName,
      consumerFirstName: formData.consumerFirstName,
      consumerLastName: formData.consumerLastName || '',
      consumerPhone: formData.consumerPhone,
      consumerEmail: formData.consumerEmail,
      ownerId: 'u1',
      ownerName: 'Alice Admin',
      assignees: [],
      priority: formData.priority as any || 'NORMAL',
      tags: [],
      internalStatus: 'ACTIVE',
      isRejected: false,
      isConverted: false,
      isDuplicate: false,
      lastActivityAt: new Date().toISOString(),
      generalNotes: [],
      stageHistory: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByName: 'Current User'
    };

    onSave(newLead);
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title="Create New Lead"
      size="md"
    >
      <form id="create-lead-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input
            required
            type="text"
            label="First Name *"
            value={formData.consumerFirstName}
            onChange={e => setFormData({...formData, consumerFirstName: e.target.value})}
          />
          <Input
            type="text"
            label="Last Name"
            value={formData.consumerLastName}
            onChange={e => setFormData({...formData, consumerLastName: e.target.value})}
          />
        </div>
        
        <Input
          required
          type="tel"
          label="Phone *"
          placeholder="+1234567890"
          value={formData.consumerPhone}
          onChange={e => setFormData({...formData, consumerPhone: e.target.value})}
          error={isDuplicate ? "Active lead exists for this phone" : undefined}
        />

        <Input
          type="email"
          label="Email"
          value={formData.consumerEmail}
          onChange={e => setFormData({...formData, consumerEmail: e.target.value})}
        />

        <Select
          required
          label="Product *"
          value={formData.productUid}
          onChange={e => setFormData({...formData, productUid: e.target.value})}
          placeholder="Select a Product"
          options={mockProducts.map(p => ({ value: p.uid, label: p.name }))}
        />

        <Select
          label="Channel Source"
          value={formData.channelUid}
          onChange={e => setFormData({...formData, channelUid: e.target.value})}
          placeholder="Select Channel"
          options={mockChannels.map(c => ({ value: c.uid, label: c.name }))}
        />

        <RadioGroup
          label="Priority"
          name="priority"
          variant="segmented"
          value={formData.priority}
          onChange={priority => setFormData({...formData, priority})}
          options={['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(priority => ({
            value: priority,
            label: priority,
          }))}
        />
      </form>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="create-lead-form"
          variant="primary"
        >
          Create Lead
        </Button>
      </DialogFooter>
    </Dialog>
  );

}
