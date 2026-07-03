import { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import DashboardScreen from './screens/DashboardScreen';
import LeadsScreen from './screens/LeadsScreen';
import CreateLeadScreen from './screens/CreateLeadScreen';
import PipelinesScreen from './screens/PipelinesScreen';
import ProductsScreen from './screens/ProductsScreen';
import CreateProductScreen from './screens/CreateProductScreen';
import ChannelsScreen from './screens/ChannelsScreen';
import CreateChannelScreen from './screens/CreateChannelScreen';
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
  ChannelEditRoute,
  LeadDetailRoute,
  PipelineDetailRoute,
  PipelineEditRoute,
  ProductDetailRoute,
  ProductEditRoute,
  TemplateEditRoute,
} from './LeadsRoutes';
import { useJaldeeLeadsContext } from './lib/sharedContext';

function LegacyLeadDetailRedirect() {
  const { leadUid } = useParams();
  return <Navigate to={`/leads/list/${leadUid ?? ""}`} replace />;
}

export function LeadsModule() {
  const navigate = useNavigate();
  const location = useLocation();
  const { availableLocations } = useJaldeeLeadsContext();
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
  const fetchRequestsRef = useRef<{
    leads: Promise<CrmLeadDto[]> | null;
    pipelines: Promise<CrmLeadPipelineDto[]> | null;
    products: Promise<Product[]> | null;
    channels: Promise<Channel[]> | null;
    forms: Promise<FormTemplate[]> | null;
  }>({
    leads: null,
    pipelines: null,
    products: null,
    channels: null,
    forms: null
  });

  const triggerFetchTemplates = (active = true, options: { force?: boolean } = {}) => {
    if (options.force) {
      fetchedRef.current.forms = false;
      fetchRequestsRef.current.forms = null;
    }
    if (fetchedRef.current.forms && !options.force) return Promise.resolve(forms);
    if (!fetchRequestsRef.current.forms) {
      fetchRequestsRef.current.forms = leadTemplateService.list()
        .finally(() => {
          fetchRequestsRef.current.forms = null;
        });
    }
    return fetchRequestsRef.current.forms
      .then((templates) => {
        fetchedRef.current.forms = true;
        if (active) {
          setForms(templates);
        }
        return templates;
      })
      .catch(() => undefined);
  };

  const triggerFetchPipelines = (active = true) => {
    if (fetchedRef.current.pipelines) return;
    if (!fetchRequestsRef.current.pipelines) {
      fetchRequestsRef.current.pipelines = leadPipelineService.search({}, { page: 0, size: 100 })
        .finally(() => {
          fetchRequestsRef.current.pipelines = null;
        });
    }
    fetchRequestsRef.current.pipelines
      .then((data) => {
        fetchedRef.current.pipelines = true;
        if (active) {
          setPipelines(data);
        }
      })
      .catch(() => {});
  };

  const triggerFetchChannels = (active = true) => {
    if (fetchedRef.current.channels) return;
    if (!fetchRequestsRef.current.channels) {
      fetchRequestsRef.current.channels = leadChannelService.search({}, { page: 0, size: 100 })
        .finally(() => {
          fetchRequestsRef.current.channels = null;
        });
    }
    fetchRequestsRef.current.channels
      .then((data) => {
        fetchedRef.current.channels = true;
        if (active) {
          setChannels(data);
        }
      })
      .catch(() => {});
  };

  const triggerFetchProducts = (active = true, options: { force?: boolean } = {}) => {
    if (options.force) {
      fetchedRef.current.products = false;
      fetchRequestsRef.current.products = null;
    }
    if (fetchedRef.current.products && !options.force) return Promise.resolve(products);
    if (!fetchRequestsRef.current.products) {
      fetchRequestsRef.current.products = leadProductService.search({}, { page: 0, size: 100 })
        .finally(() => {
          fetchRequestsRef.current.products = null;
        });
    }
    return fetchRequestsRef.current.products
      .then((data) => {
        fetchedRef.current.products = true;
        if (active) {
          setProducts(data);
        }
        return data;
      })
      .catch(() => [] as Product[]);
  };

  const triggerFetchLeads = (active = true, filters: Record<string, unknown> = {}, options: { force?: boolean } = {}) => {
    const hasFilters = Object.keys(filters).length > 0;
    if (fetchedRef.current.leads && !hasFilters && !options.force) return;
    const request =
      hasFilters || options.force
        ? leadService.search(filters, { page: 0, size: 100 })
        : fetchRequestsRef.current.leads ??
          (fetchRequestsRef.current.leads = leadService.search(filters, { page: 0, size: 100 })
            .finally(() => {
              fetchRequestsRef.current.leads = null;
            }));
    request
      .then((data) => {
        if (!hasFilters) {
          fetchedRef.current.leads = true;
        }
        if (active) {
          setLeads(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    let active = true;
    const path = location.pathname;
    const isListPage = path.endsWith('/list') || path.endsWith('/list/');
    const isCreateLeadPage = path.includes('/list/create');
    const isLeadDetailPage = path.includes('/list/') && !isCreateLeadPage;

    if (path.includes('/dashboard')) {
      triggerFetchPipelines(active);
      triggerFetchProducts(active);
      triggerFetchChannels(active);
    } else if (isListPage || isCreateLeadPage) {
      triggerFetchLeads(active);
      triggerFetchPipelines(active);
      triggerFetchProducts(active);
      triggerFetchChannels(active);
      triggerFetchTemplates(active);
    } else if (isLeadDetailPage) {
      triggerFetchLeads(active);
      triggerFetchPipelines(active);
      triggerFetchProducts(active);
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
              pipelines={pipelines}
              products={products}
              channels={channels}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route
          path="/list"
          element={
            <LeadsScreen
              leads={leads}
              setLeads={setLeads}
              pipelines={pipelines}
              setPipelines={setPipelines}
              products={products}
              channels={channels}
              forms={forms}
              fetchLeads={(filters, options) => triggerFetchLeads(true, filters, options)}
              fetchPipelines={() => triggerFetchPipelines(true)}
              fetchProducts={() => triggerFetchProducts(true)}
              fetchChannels={() => triggerFetchChannels(true)}
              fetchTemplates={() => triggerFetchTemplates(true)}
            />
          }
        />
        <Route
          path="/list/create"
          element={
            <CreateLeadScreen
              pipelines={pipelines}
              products={products}
              channels={channels}
              leads={leads}
              forms={forms}
              onBack={() => navigate('/leads/list')}
              onSave={(newLead) => {
                setLeads((prev) => [newLead, ...prev]);
                triggerFetchLeads(true, {}, { force: true });
                navigate('/leads/list');
              }}
            />
          }
        />
        <Route
          path="/list/:leadUid"
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
        <Route path="/leads" element={<Navigate to="/leads/list" replace />} />
        <Route path="/leads/create" element={<Navigate to="/leads/list/create" replace />} />
        <Route path="/leads/:leadUid" element={<LegacyLeadDetailRedirect />} />
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
                await triggerFetchProducts(true, { force: true });
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
              onSave={async (template) => {
                setForms(prev => [template, ...prev.filter(item => item.uid !== template.uid)]);
                await triggerFetchTemplates(true, { force: true });
                navigate('/leads/templates');
              }}
            />
          }
        />
        <Route
          path="/templates/:templateUid/edit"
          element={
            <TemplateEditRoute
              forms={forms}
              setForms={setForms}
              refreshTemplates={() => triggerFetchTemplates(true, { force: true })}
            />
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
                await leadChannelService.create(channel, availableLocations);
                const latestChannels = await leadChannelService.search();
                setChannels(latestChannels);
                navigate('/leads/channels');
              }}
            />
          }
        />
        <Route
          path="/channels/:channelUid/edit"
          element={
            <ChannelEditRoute
              products={products}
              channels={channels}
              setChannels={setChannels}
              availableLocations={availableLocations}
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
          path="/audit-log"
          element={
            <AuditLogScreen />
          }
        />
        <Route
          path="*"
          element={
            <DashboardScreen
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
