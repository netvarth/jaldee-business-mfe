import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Product, CrmLeadDto, CrmLeadPipelineDto, Channel, FormTemplate } from '../types';
import { cn } from '../lib/utils';
import { ICONS } from '../constants';
import { cameFromDashboard, navigateBackToDashboard } from '../lib/navigationOrigin';
import { Button, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { leadProductService } from '../services/productService';

interface ProductsScreenProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  leads: CrmLeadDto[];
  pipelines: CrmLeadPipelineDto[];
  channels: Channel[];
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  forms: FormTemplate[];
  initialSelectedId?: string;
  onNavigate: (route: string, selection?: any) => void;
  fetchLeads?: () => void;
  fetchPipelines?: () => void;
  fetchChannels?: () => void;
  fetchTemplates?: () => void;
}

export default function ProductsScreen({
  products,
  setProducts,
  leads,
  pipelines,
  channels,
  setChannels,
  forms,
  initialSelectedId,
  onNavigate,
  fetchLeads,
  fetchPipelines,
  fetchChannels,
  fetchTemplates
}: ProductsScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const showDashboardBack = cameFromDashboard(location);

  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [mutatingProductUid, setMutatingProductUid] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialSelectedId) {
      const found = products.find(p => p.uid === initialSelectedId);
      if (found) {
        navigate(`/leads/products/${found.uid}/inventory`);
      }
    }
  }, [initialSelectedId, products, navigate]);

  const handleDelete = async (uid: string) => {
    if (confirm('Deactivate this product line?')) {
      setMutatingProductUid(uid);
      setProductsError(null);
      try {
        await leadProductService.updateStatus(uid, 'INACTIVE');
        setProducts(products.map(p => p.uid === uid ? { ...p, status: 'INACTIVE' } : p));
      } catch (error) {
        setProductsError(error instanceof Error ? error.message : 'Unable to update product status.');
      } finally {
        setMutatingProductUid(null);
      }
    }
  };

  const handleInspectProduct = (product: Product) => {
    fetchLeads?.();
    fetchPipelines?.();
    fetchChannels?.();
    setProductsError(null);
    navigate(`/leads/products/${product.uid}/inventory`);
  };

  return (
    <div data-testid="jaldee-leads-products-page" className="h-full flex flex-col bg-slate-50 p-4 sm:p-6 md:p-8 no-scrollbar overflow-y-auto pb-24 relative space-y-6">
      <PageHeader
        back={showDashboardBack ? { label: 'Back to Dashboard', href: '/leads/dashboard' } : undefined}
        onNavigate={() => navigateBackToDashboard(navigate)}
        title="Product Inventory"
        subtitle="Portfolio Offerings & Workflow Deployments"
        actions={
          <Button
            id="jaldee-leads-new-product-button"
            data-testid="jaldee-leads-new-product-button"
            onClick={() => {
              fetchChannels?.();
              fetchTemplates?.();
              navigate('/leads/products/create');
            }}
            variant="primary"
            icon={<ICONS.ADD className="w-4 h-4" />}
            className="px-6 py-3 text-xs font-semibold active-scale"
          >
            New Product
          </Button>
        }
      />

      {productsError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {productsError}
        </div>
      )}

      {isLoadingProducts && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
          Loading products...
        </div>
      )}

      {products.length === 0 ? (
        <SectionCard className="border-slate-200 shadow-sm flex flex-col items-center justify-center p-8 bg-white">
          <EmptyState 
            title="No product / service found" 
            description="Configure your portfolio offerings to map pipelines, channels, and templates." 
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),23rem))] justify-start gap-6">
          {products.map((product) => {
            const selectedTemplate = forms.find(form => form.uid === product.leadTemplateUid);
            const leadTemplateLabel = product.leadTemplateName || selectedTemplate?.name || (product.leadTemplateUid ? 'DYNAMIC FORM' : 'NOT SELECTED');
            const selectedPipeline = pipelines.find(pipeline => pipeline.uid === product.defaultPipelineUid);
            const pipelineLabel = product.defaultPipelineName || selectedPipeline?.name || 'NOT MAPPED';
            const productActiveLeads = leads.filter(l => l.productUid === product.uid && !l.isConverted && !l.isRejected).length;
            const productLinkedChannels = channels.filter(c => c.productUid === product.uid).length;
            const productTypeLabel = product.productTypeEnum || product.productType || product.productEnum || 'UNKNOWN';
            const cardDescription = product.description?.trim();
            const showDescription = Boolean(cardDescription && !/template.*uid/i.test(cardDescription));

            return (
              <SectionCard
                key={product.uid}
                data-testid={`jaldee-leads-product-${product.uid}-card`}
                onClick={() => handleInspectProduct(product)}
                className="relative group overflow-hidden border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-200 hover:shadow-md cursor-pointer min-h-[300px]"
              >
                <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                  <Button
                    id={`jaldee-leads-product-${product.uid}-edit-button`}
                    data-testid={`jaldee-leads-product-${product.uid}-edit-button`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchChannels?.();
                      fetchTemplates?.();
                      navigate(`/leads/products/${product.uid}/edit`);
                    }}
                    size="sm"
                    variant="ghost"
                    iconOnly
                    icon={<ICONS.EDIT className="h-4 w-4" />}
                    className="h-8 w-8 px-0 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                    aria-label={`Edit ${product.name}`}
                    title="Edit product"
                  />
                  <Button
                    id={`jaldee-leads-product-${product.uid}-delete-button`}
                    data-testid={`jaldee-leads-product-${product.uid}-delete-button`}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(product.uid); }}
                    disabled={mutatingProductUid === product.uid}
                    size="sm"
                    variant="ghost"
                    iconOnly
                    icon={<ICONS.DELETE className="h-4 w-4" />}
                    className="h-8 w-8 px-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    aria-label={`Delete ${product.name}`}
                    title="Deactivate product"
                  />
                </div>

                <div className="relative flex h-full flex-col gap-5">
                  <div className="flex items-start gap-3 pr-24">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <ICONS.PRODUCTS className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="m-0 line-clamp-2 text-base font-semibold leading-snug text-slate-900 group-hover:text-indigo-600">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600">
                          {productTypeLabel}
                        </span>
                        <span className={cn(
                          "rounded-md border px-2 py-1 text-[11px] font-semibold",
                          product.status === 'ACTIVE' || product.status === 'Enabled' || !product.status
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-slate-50 text-slate-400 border-slate-150"
                        )}>
                          {product.status || 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600">
                      {product.productEnum || productTypeLabel}
                    </span>
                    {product.displayName ? (
                      <span className="rounded-md border border-slate-100 bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                        {product.displayName}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-slate-50 p-3">
                      <span className="block text-xs font-semibold text-slate-400">Linked Pipeline</span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-900">{pipelineLabel}</span>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <span className="block text-xs font-semibold text-slate-400">Lead Template</span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-900">{leadTemplateLabel}</span>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <span className="block text-xs font-semibold text-slate-400">Captures</span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-900">{productActiveLeads} Active Leads</span>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <span className="block text-xs font-semibold text-slate-400">Network Nodes</span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-900">{productLinkedChannels} Channels</span>
                    </div>
                  </div>

                  {showDescription ? (
                    <p className="m-0 line-clamp-2 text-sm leading-6 text-slate-500">{cardDescription}</p>
                  ) : null}

                  <div className="mt-auto border-t border-slate-100 pt-4">
                    <button
                      id={`jaldee-leads-product-${product.uid}-inspect-inventory-button`}
                      data-testid={`jaldee-leads-product-${product.uid}-inspect-inventory-button`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInspectProduct(product);
                      }}
                      className="inline-flex items-center p-0 text-sm font-semibold text-indigo-600 transition-all group-hover:translate-x-1"
                    >
                      Inspect Inventory
                    </button>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

    </div>
  );
}
