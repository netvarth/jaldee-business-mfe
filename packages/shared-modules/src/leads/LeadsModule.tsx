import { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import DashboardScreen from './screens/DashboardScreen';
import LeadsScreen from './screens/LeadsScreen';
import CreateLeadScreen from './screens/CreateLeadScreen';
import PipelinesScreen from './screens/PipelinesScreen';
import ProductsScreen from './screens/ProductsScreen';
import CreateProductScreen from './screens/CreateProductScreen';
import ChannelsScreen from './screens/ChannelsScreen';
import CreateChannelScreen from './screens/CreateChannelScreen';
import BulkImportScreen from './screens/BulkImportScreen';
import AuditLogScreen from './screens/AuditLogScreen';
import TemplateBuilderScreen from './screens/TemplateBuilderScreen';
import TemplatesScreen from './screens/TemplatesScreen';
import { CrmLeadDto, CrmLeadPipelineDto, Product, Channel, FormTemplate } from './types';
import { leadProductService } from './services/productService';
import { leadTemplateService } from './services/templateService';
import { leadPipelineService } from './services/pipelineService';
import { leadChannelService } from './services/channelService';
import { leadService } from './services/leadService';
import {
  ChannelDetailRoute,
  LeadDetailRoute,
  PipelineDetailRoute,
  PipelineEditRoute,
  ProductDetailRoute,
  ProductEditRoute,
  TemplateEditRoute,
} from './LeadsRoutes';

export function LeadsModule() {
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
    } else if (path.includes('/products/create') || (path.includes('/products/') && path.includes('/edit'))) {
      triggerFetchProducts(active);
      triggerFetchChannels(active);
      triggerFetchTemplates(active);
      triggerFetchPipelines(active);
    } else if (path.includes('/products')) {
      triggerFetchProducts(active);
      triggerFetchLeads(active);
      triggerFetchPipelines(active);
      triggerFetchChannels(active);
      triggerFetchTemplates(active);
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
    navigate(`/leads/${normalizedRoute}`);
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
          path="/leads/create"
          element={
            <CreateLeadScreen
              pipelines={pipelines}
              products={products}
              channels={channels}
              leads={leads}
              forms={forms}
              onBack={() => navigate('/leads/leads')}
              onSave={(newLead) => {
                setLeads((prev) => [newLead, ...prev]);
                navigate('/leads/leads');
              }}
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
          path="/products/:productUid/inventory"
          element={
            <ProductDetailRoute
              products={products}
              setProducts={setProducts}
              leads={leads}
              pipelines={pipelines}
              setPipelines={setPipelines}
              channels={channels}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route
          path="/products/:productUid"
          element={<Navigate to="inventory" replace />}
        />
        <Route
          path="/products/:productUid/edit"
          element={
            <ProductEditRoute
              products={products}
              setProducts={setProducts}
              channels={channels}
              setChannels={setChannels}
              forms={forms}
              pipelines={pipelines}
            />
          }
        />
        <Route
          path="/products/create"
          element={
            <CreateProductScreen
              channels={channels}
              forms={forms}
              pipelines={pipelines}
              onBack={() => navigate('/leads/products')}
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
                navigate('/leads/products');
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
                navigate('/leads/templates');
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
          path="/channels/create"
          element={
            <CreateChannelScreen
              products={products}
              onBack={() => navigate('/leads/channels')}
              onSave={async (channel) => {
                const createdChannel = await leadChannelService.create(channel);
                setChannels((prev) => [createdChannel, ...prev.filter((item) => item.uid !== createdChannel.uid)]);
                navigate('/leads/channels');
              }}
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
