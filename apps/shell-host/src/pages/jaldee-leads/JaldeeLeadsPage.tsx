import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import DashboardScreen from './screens/DashboardScreen';
import LeadsScreen from './screens/LeadsScreen';
import PipelinesScreen from './screens/PipelinesScreen';
import ProductsScreen from './screens/ProductsScreen';
import CreateProductScreen from './screens/CreateProductScreen';
import ChannelsScreen from './screens/ChannelsScreen';
import ChannelDetailScreen from './screens/ChannelDetailScreen';
import LeadDetailScreen from './screens/LeadDetailScreen';
import BulkImportScreen from './screens/BulkImportScreen';
import AuditLogScreen from './screens/AuditLogScreen';
import TemplateBuilderScreen from './screens/TemplateBuilderScreen';
import TemplatesScreen from './screens/TemplatesScreen';
import { CrmLeadDto, CrmLeadPipelineDto, Product, Channel, FormTemplate } from './types';
import { mockLeads, mockPipelines, mockProducts, mockChannels, mockForms } from './mockData';
import { leadProductService } from './services/productService';
import { leadTemplateService } from './services/templateService';
import { leadPipelineService } from './services/pipelineService';
import { leadChannelService } from './services/channelService';
import { leadService } from './services/leadService';
import PipelineDetailScreen from './screens/PipelineDetailScreen';
import { PipelineBuilder } from './screens/PipelinesScreen';

function PipelineDetailRoute({
  pipelines,
  leads,
  setPipelines,
  onNavigate,
}: {
  pipelines: CrmLeadPipelineDto[];
  leads: CrmLeadDto[];
  setPipelines: React.Dispatch<React.SetStateAction<CrmLeadPipelineDto[]>>;
  onNavigate: (route: string, selection?: { type: string; id: string }) => void;
}) {
  const navigate = useNavigate();
  const { pipelineUid } = useParams();
  const pipelineState = pipelines.find((p) => p.uid === pipelineUid) ?? null;
  const [pipeline, setPipeline] = useState<CrmLeadPipelineDto | null>(pipelineState);

  useEffect(() => {
    if (pipelineUid) {
      leadPipelineService.detail(pipelineUid)
        .then((detailed) => {
          setPipeline(detailed);
          setPipelines((prev) => prev.map((old) => (old.uid === pipelineUid ? detailed : old)));
        })
        .catch((err) => console.error('Failed to load pipeline detail:', err));
    }
  }, [pipelineUid, setPipelines]);

  if (!pipeline) return null;

  return (
    <PipelineDetailScreen
      pipeline={pipeline}
      leads={leads}
      onBack={() => navigate('/jaldee-leads/pipelines')}
      onNavigate={onNavigate}
      onEdit={() =>
        navigate(`/jaldee-leads/pipelines/${pipeline.uid}`, {
          state: { returnTo: `/jaldee-leads/pipelines/${pipeline.uid}/matrix` },
        })
      }
    />
  );
}

function PipelineEditRoute({
  pipelines,
  setPipelines,
}: {
  pipelines: CrmLeadPipelineDto[];
  setPipelines: React.Dispatch<React.SetStateAction<CrmLeadPipelineDto[]>>;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { pipelineUid } = useParams();
  const pipelineState = pipelines.find((p) => p.uid === pipelineUid) ?? null;
  const [pipeline, setPipeline] = useState<CrmLeadPipelineDto | null>(pipelineState);
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(Boolean(pipelineUid));
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const returnPath = returnTo?.startsWith('/jaldee-leads/pipelines/')
    ? returnTo
    : '/jaldee-leads/pipelines';

  useEffect(() => {
    if (!pipelineUid) return;
    let active = true;
    setIsLoadingPipeline(true);
    leadPipelineService.detail(pipelineUid)
      .then((detailed) => {
        if (!active) return;
        const pipelineForEdit = {
          ...pipelineState,
          ...detailed,
          stages: detailed.stages?.length ? detailed.stages : pipelineState?.stages ?? [],
        };
        setPipeline(pipelineForEdit);
        setPipelines((prev) =>
          prev.some((old) => old.uid === pipelineForEdit.uid)
            ? prev.map((old) => (old.uid === pipelineForEdit.uid ? pipelineForEdit : old))
            : [pipelineForEdit, ...prev]
        );
      })
      .catch((err) => {
        console.error('Failed to load pipeline for editing:', err);
        if (active && pipelineState) setPipeline(pipelineState);
      })
      .finally(() => {
        if (active) setIsLoadingPipeline(false);
      });

    return () => {
      active = false;
    };
  }, [pipelineUid, setPipelines]);

  if (isLoadingPipeline) {
    return <div className="shell-loading">Loading pipeline...</div>;
  }

  if (!pipeline) return null;

  return (
    <PipelineBuilder
      key={`${pipeline.uid}-${pipeline.stages?.length ?? 0}`}
      pipeline={pipeline}
      onClose={() => navigate(returnPath)}
      onSave={async (p) => {
        setPipelines((prev) =>
          prev.some((old) => old.uid === p.uid)
            ? prev.map((old) => (old.uid === p.uid ? p : old))
            : [p, ...prev]
        );
        try {
          const updatedPipelines = await leadPipelineService.search({}, { page: 0, size: 100 });
          if (updatedPipelines && updatedPipelines.length > 0) {
            setPipelines(updatedPipelines);
          }
        } catch (err) {
          console.error('Failed to refetch pipelines after save:', err);
        }
        navigate(returnPath);
      }}
    />
  );
}

function TemplateEditRoute({
  forms,
  setForms,
}: {
  forms: FormTemplate[];
  setForms: React.Dispatch<React.SetStateAction<FormTemplate[]>>;
}) {
  const navigate = useNavigate();
  const { templateUid } = useParams();
  const template = forms.find((item) => item.uid === templateUid) ?? null;

  return (
    <TemplateBuilderScreen
      initialTemplate={template}
      onSave={(updatedTemplate) => {
        setForms(prev => [updatedTemplate, ...prev.filter(item => item.uid !== updatedTemplate.uid)]);
        navigate('/jaldee-leads/templates');
      }}
    />
  );
}

function LeadDetailRoute({
  leads,
  pipelines,
  products,
  onNavigate,
  setLeads,
  setPipelines,
}: {
  leads: CrmLeadDto[];
  pipelines: CrmLeadPipelineDto[];
  products: Product[];
  onNavigate: (route: string, selection?: any) => void;
  setLeads: React.Dispatch<React.SetStateAction<CrmLeadDto[]>>;
  setPipelines: React.Dispatch<React.SetStateAction<CrmLeadPipelineDto[]>>;
}) {
  const navigate = useNavigate();
  const { leadUid } = useParams();
  const lead = leads.find((l) => l.uid === leadUid) ?? null;

  useEffect(() => {
    if (!lead?.pipelineUid) return;

    const pipelineState = pipelines.find((p) => p.uid === lead.pipelineUid);
    if (pipelineState?.stages?.length) return;

    let active = true;
    leadPipelineService.detail(lead.pipelineUid)
      .then((detailed) => {
        if (!active) return;
        setPipelines((prev) =>
          prev.some((old) => old.uid === detailed.uid)
            ? prev.map((old) => (old.uid === detailed.uid ? { ...old, ...detailed } : old))
            : [detailed, ...prev]
        );
      })
      .catch((err) => console.error('Failed to load lead pipeline stages:', err));

    return () => {
      active = false;
    };
  }, [lead?.pipelineUid, pipelines, setPipelines]);

  if (!lead) return null;

  return (
    <LeadDetailScreen
      lead={lead}
      leads={leads}
      pipelines={pipelines}
      setPipelines={setPipelines}
      products={products}
      onBack={() => {
        if (window.history.state && window.history.state.idx > 0) {
          navigate(-1);
        } else {
          navigate('/jaldee-leads/leads');
        }
      }}
      onUpdate={(updatedLead) => {
        setLeads((prev) => prev.map((l) => l.uid === updatedLead.uid ? updatedLead : l));
      }}
    />
  );
}

function ChannelDetailRoute({
  channels,
  leads,
  pipelines,
  products,
  forms,
  onNavigate,
}: {
  channels: Channel[];
  leads: CrmLeadDto[];
  pipelines: CrmLeadPipelineDto[];
  products: Product[];
  forms: FormTemplate[];
  onNavigate: (route: string, selection?: { type: string; id: string }) => void;
}) {
  const navigate = useNavigate();
  const { channelUid } = useParams();
  const channel = channels.find((c) => c.uid === channelUid) ?? null;

  if (!channel) return null;

  return (
    <ChannelDetailScreen
      channel={channel}
      leads={leads}
      pipelines={pipelines}
      products={products}
      forms={forms}
      onBack={() => navigate('/jaldee-leads/channels')}
      onNavigate={onNavigate}
    />
  );
}

export default function JaldeeLeadsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [leads, setLeads] = useState<CrmLeadDto[]>([]);
  const [pipelines, setPipelines] = useState<CrmLeadPipelineDto[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [activeSelection, setActiveSelection] = useState<{ type: string; id: string } | null>(null);

  const fetchedRef = useRef({
    leads: false,
    pipelines: false,
    products: false,
    channels: false,
    forms: false
  });

  const triggerFetchTemplates = (active = true) => {
    if (fetchedRef.current.forms) return;
    leadTemplateService.list()
      .then((templates) => {
        if (active && templates.length) {
          setForms(templates);
          fetchedRef.current.forms = true;
        }
      })
      .catch(() => {});
  };

  const triggerFetchPipelines = (active = true) => {
    if (fetchedRef.current.pipelines) return;
    leadPipelineService.search({}, { page: 0, size: 100 })
      .then((data) => {
        if (active && data.length) {
          setPipelines(data);
          fetchedRef.current.pipelines = true;
        }
      })
      .catch(() => {});
  };

  const triggerFetchChannels = (active = true) => {
    if (fetchedRef.current.channels) return;
    leadChannelService.search({}, { page: 0, size: 100 })
      .then((data) => {
        if (active && data.length) {
          setChannels(data);
          fetchedRef.current.channels = true;
        }
      })
      .catch(() => {});
  };

  const triggerFetchProducts = (active = true) => {
    if (fetchedRef.current.products) return;
    leadProductService.search({}, { page: 0, size: 100 })
      .then((data) => {
        if (active && data.length) {
          setProducts(data);
          fetchedRef.current.products = true;
        }
      })
      .catch(() => {});
  };

  const triggerFetchLeads = (active = true) => {
    if (fetchedRef.current.leads) return;
    leadService.search({}, { page: 0, size: 100 })
      .then((data) => {
        if (active && data.length) {
          setLeads(data);
          fetchedRef.current.leads = true;
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    let active = true;
    const path = location.pathname;

    if (path.includes('/dashboard')) {
      triggerFetchLeads(active);
      triggerFetchPipelines(active);
      triggerFetchProducts(active);
      triggerFetchChannels(active);
    } else if (path.includes('/leads')) {
      triggerFetchLeads(active);
      triggerFetchPipelines(active);
      triggerFetchProducts(active);
      triggerFetchChannels(active);
      triggerFetchTemplates(active);
    } else if (path.includes('/pipelines')) {
      triggerFetchPipelines(active);
      triggerFetchLeads(active);
    } else if (path.includes('/products/create')) {
      triggerFetchChannels(active);
      triggerFetchTemplates(active);
    } else if (path.includes('/products')) {
      triggerFetchProducts(active);
    } else if (path.includes('/templates')) {
      triggerFetchTemplates(active);
    } else if (path.includes('/channels')) {
      triggerFetchChannels(active);
      triggerFetchLeads(active);
      triggerFetchProducts(active);
      triggerFetchPipelines(active);
      triggerFetchTemplates(active);
    } else if (path.includes('/bulk-import')) {
      triggerFetchLeads(active);
      triggerFetchProducts(active);
      triggerFetchChannels(active);
      triggerFetchPipelines(active);
    } else {
      triggerFetchLeads(active);
      triggerFetchPipelines(active);
      triggerFetchProducts(active);
      triggerFetchChannels(active);
    }

    return () => {
      active = false;
    };
  }, [location.pathname]);

  const handleNavigate = (route: string, selection?: { type: string; id: string }) => {
    if (selection) {
      setActiveSelection(selection);
    } else {
      setActiveSelection(null);
    }
    const normalizedRoute = route.replace('_', '-');
    navigate(`/jaldee-leads/${normalizedRoute}`);
  };

  return (
    <div className="mfe-wrapper jaldee-leads-page h-full">
      <Routes>
        <Route
          path="/dashboard"
          element={
            <DashboardScreen
              leads={leads}
              pipelines={pipelines}
              products={products}
              channels={channels}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route
          path="/leads"
          element={
            <LeadsScreen
              leads={leads}
              setLeads={setLeads}
              pipelines={pipelines}
              setPipelines={setPipelines}
              products={products}
              channels={channels}
              forms={forms}
              fetchPipelines={() => triggerFetchPipelines(true)}
              fetchProducts={() => triggerFetchProducts(true)}
              fetchChannels={() => triggerFetchChannels(true)}
              fetchTemplates={() => triggerFetchTemplates(true)}
            />
          }
        />
        <Route
          path="/leads/:leadUid"
          element={
            <LeadDetailRoute
              leads={leads}
              pipelines={pipelines}
              products={products}
              onNavigate={handleNavigate}
              setLeads={setLeads}
              setPipelines={setPipelines}
            />
          }
        />
        <Route
          path="/pipelines"
          element={
            <PipelinesScreen
              pipelines={pipelines}
              setPipelines={setPipelines}
              leads={leads}
              initialSelectedId={activeSelection?.type === 'pipeline' ? activeSelection.id : undefined}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route
          path="/pipelines/:pipelineUid"
          element={
            <PipelineEditRoute
              pipelines={pipelines}
              setPipelines={setPipelines}
            />
          }
        />
        <Route
          path="/pipelines/:pipelineUid/matrix"
          element={
            <PipelineDetailRoute
              pipelines={pipelines}
              leads={leads}
              setPipelines={setPipelines}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route
          path="/pipelines/:pipelineUid/edit"
          element={<Navigate to=".." replace />}
        />
        <Route
          path="/products"
          element={
            <ProductsScreen
              leads={leads}
              products={products}
              setProducts={setProducts}
              pipelines={pipelines}
              channels={channels}
              setChannels={setChannels}
              forms={forms}
              initialSelectedId={activeSelection?.type === 'product' ? activeSelection.id : undefined}
              onNavigate={handleNavigate}
              fetchLeads={() => triggerFetchLeads(true)}
              fetchPipelines={() => triggerFetchPipelines(true)}
              fetchChannels={() => triggerFetchChannels(true)}
              fetchTemplates={() => triggerFetchTemplates(true)}
            />
          }
        />
        <Route
          path="/products/create"
          element={
            <CreateProductScreen
              channels={channels}
              forms={forms}
              onBack={() => navigate('/jaldee-leads/products')}
              onSave={async (product, selectedChannelUids) => {
                const createdProduct = await leadProductService.create(product);
                const productForCard = {
                  ...product,
                  ...createdProduct,
                  uid: createdProduct.uid || product.uid,
                  name: createdProduct.name || product.name,
                  displayName: createdProduct.displayName || product.displayName,
                  defaultPipelineName: createdProduct.defaultPipelineName || product.defaultPipelineName,
                  leadTemplateUid: createdProduct.leadTemplateUid || product.leadTemplateUid,
                  leadTemplateName: createdProduct.leadTemplateName || product.leadTemplateName,
                  templateTitle: createdProduct.templateTitle || product.templateTitle,
                  description: createdProduct.description || product.description,
                  productType: createdProduct.productType || product.productType,
                  productTypeEnum: createdProduct.productTypeEnum || product.productTypeEnum,
                  productEnum: createdProduct.productEnum || product.productEnum,
                  status: createdProduct.status || product.status || 'Enabled',
                };
                setProducts(prev => [...prev, productForCard]);
                if (selectedChannelUids.length > 0) {
                  setChannels(prev =>
                    prev.map(c =>
                      selectedChannelUids.includes(c.uid)
                        ? { ...c, productUid: productForCard.uid, productName: productForCard.name }
                        : c
                    )
                  );
                }
                navigate('/jaldee-leads/products');
              }}
            />
          }
        />
        <Route
          path="/templates"
          element={
            <TemplatesScreen forms={forms} setForms={setForms} />
          }
        />
        <Route
          path="/templates/create"
          element={
            <TemplateBuilderScreen
              onSave={(template) => {
                setForms(prev => [template, ...prev.filter(item => item.uid !== template.uid)]);
                navigate('/jaldee-leads/templates');
              }}
            />
          }
        />
        <Route
          path="/templates/:templateUid/edit"
          element={
            <TemplateEditRoute forms={forms} setForms={setForms} />
          }
        />
        <Route
          path="/channels"
          element={
            <ChannelsScreen
              leads={leads}
              channels={channels}
              setChannels={setChannels}
              products={products}
              pipelines={pipelines}
              initialSelectedId={activeSelection?.type === 'channel' ? activeSelection.id : undefined}
              onNavigate={handleNavigate}
              fetchLeads={() => triggerFetchLeads(true)}
              fetchProducts={() => triggerFetchProducts(true)}
              fetchPipelines={() => triggerFetchPipelines(true)}
            />
          }
        />
        <Route
          path="/channels/:channelUid"
          element={
            <ChannelDetailRoute
              channels={channels}
              leads={leads}
              pipelines={pipelines}
              products={products}
              forms={forms}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route
          path="/bulk-import"
          element={
            <BulkImportScreen
              leads={leads}
              setLeads={setLeads}
              products={products}
              channels={channels}
              pipelines={pipelines}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route
          path="/audit-log"
          element={
            <AuditLogScreen />
          }
        />
        <Route
          path="*"
          element={
            <DashboardScreen
              leads={leads}
              pipelines={pipelines}
              products={products}
              channels={channels}
              onNavigate={handleNavigate}
            />
          }
        />
      </Routes>
    </div>
  );
}
