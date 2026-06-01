import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import DashboardScreen from './screens/DashboardScreen';
import LeadsScreen from './screens/LeadsScreen';
import PipelinesScreen from './screens/PipelinesScreen';
import ProductsScreen from './screens/ProductsScreen';
import CreateProductScreen from './screens/CreateProductScreen';
import ChannelsScreen from './screens/ChannelsScreen';
import BulkImportScreen from './screens/BulkImportScreen';
import AuditLogScreen from './screens/AuditLogScreen';
import TemplateBuilderScreen from './screens/TemplateBuilderScreen';
import TemplatesScreen from './screens/TemplatesScreen';
import { CrmLeadDto, CrmLeadPipelineDto, Product, Channel, FormTemplate } from './types';
import { mockLeads, mockPipelines, mockProducts, mockChannels, mockForms } from './mockData';
import { leadProductService } from './services/productService';
import { leadTemplateService } from './services/templateService';
import { leadPipelineService } from './services/pipelineService';

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

export default function JaldeeLeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<CrmLeadDto[]>(mockLeads);
  const [pipelines, setPipelines] = useState<CrmLeadPipelineDto[]>(mockPipelines);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [channels, setChannels] = useState<Channel[]>(mockChannels);
  const [forms, setForms] = useState<FormTemplate[]>(mockForms);
  const [activeSelection, setActiveSelection] = useState<{ type: string; id: string } | null>(null);

  useEffect(() => {
    let active = true;

    leadTemplateService.list()
      .then((templates) => {
        if (active && templates.length) {
          setForms(templates);
        }
      })
      .catch(() => {
        // Keep mock templates as local fallback when the API is unavailable.
      });

    leadPipelineService.search({}, { page: 0, size: 100 })
      .then((data) => {
        if (active && data.length) {
          setPipelines(data);
        }
      })
      .catch(() => {
        // Keep mock pipelines as local fallback when the API is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

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
