import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, CrmLeadDto, CrmLeadPipelineDto, Channel, FormTemplate } from '../types';
import { cn } from '../lib/utils';
import { ICONS } from '../constants';
import ProductDetailScreen from './ProductDetailScreen';
import CreateProductScreen from './CreateProductScreen';
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

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => {
    if (initialSelectedId) {
      return products.find(p => p.uid === initialSelectedId) || null;
    }
    return null;
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [mutatingProductUid, setMutatingProductUid] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Effect to update selected product if initialSelectedId changes
  React.useEffect(() => {
    if (initialSelectedId) {
      const found = products.find(p => p.uid === initialSelectedId);
      if (found) setSelectedProduct(found);
    }
  }, [initialSelectedId, products]);

  const handleDelete = async (uid: string) => {
    if (confirm('Deactivate this product line?')) {
      setMutatingProductUid(uid);
      setProductsError(null);
      try {
        await leadProductService.updateStatus(uid, 'INACTIVE');
        setProducts(products.map(p => p.uid === uid ? { ...p, status: 'INACTIVE' } : p));
        if (selectedProduct?.uid === uid) {
          setSelectedProduct({ ...selectedProduct, status: 'INACTIVE' });
        }
      } catch (error) {
        setProductsError(error instanceof Error ? error.message : 'Unable to update product status.');
      } finally {
        setMutatingProductUid(null);
      }
    }
  };

  const handleOpenProduct = async (product: Product) => {
    setSelectedProduct(product);
    fetchLeads?.();
    fetchPipelines?.();
    fetchChannels?.();
    setProductsError(null);

    try {
      const detail = await leadProductService.detail(product.uid);
      setSelectedProduct(detail);
      setProducts((current) => current.map((item) => item.uid === detail.uid ? detail : item));
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : 'Unable to load product detail.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 sm:p-6 md:p-8 no-scrollbar overflow-y-auto pb-24 relative space-y-6">
      <PageHeader
        title="Product Inventory"
        subtitle="Portfolio Offerings & Workflow Deployments"
        actions={
          <Button
            onClick={() => {
              fetchChannels?.();
              fetchTemplates?.();
              navigate('/jaldee-leads/products/create');
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
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
                onClick={() => handleOpenProduct(product)}
                className="relative group overflow-hidden border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-200 hover:shadow-md cursor-pointer min-h-[300px]"
              >
                <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProduct(product);
                      fetchChannels?.();
                      fetchTemplates?.();
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

                  <div className="mt-auto border-t border-slate-100 pt-4 text-sm font-semibold text-indigo-600">
                    <span className="transition-all group-hover:translate-x-1 inline-block">Inspect Inventory</span>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}


      {selectedProduct && (
        <div className="absolute inset-0 z-50 bg-slate-50">
          <ProductDetailScreen 
            product={selectedProduct} 
            leads={leads}
            pipelines={pipelines}
            channels={channels}
            onBack={() => setSelectedProduct(null)} 
            onNavigate={onNavigate}
            onUpdateProduct={async (updatedProduct) => {
              const savedProduct = await leadProductService.update(updatedProduct.uid, updatedProduct);
              const productForCard = {
                ...updatedProduct,
                ...savedProduct,
                uid: savedProduct.uid || updatedProduct.uid,
                name: savedProduct.name || updatedProduct.name,
                displayName: savedProduct.displayName || updatedProduct.displayName,
                defaultPipelineName: savedProduct.defaultPipelineName || updatedProduct.defaultPipelineName,
                leadTemplateUid: savedProduct.leadTemplateUid || updatedProduct.leadTemplateUid,
                leadTemplateName: savedProduct.leadTemplateName || updatedProduct.leadTemplateName,
                templateTitle: savedProduct.templateTitle || updatedProduct.templateTitle,
                description: savedProduct.description || updatedProduct.description,
                productType: savedProduct.productType || updatedProduct.productType,
                productTypeEnum: savedProduct.productTypeEnum || updatedProduct.productTypeEnum,
                productEnum: savedProduct.productEnum || updatedProduct.productEnum,
                status: savedProduct.status || updatedProduct.status,
              };
              setProducts(products.map(p => p.uid === productForCard.uid ? productForCard : p));
              setSelectedProduct(productForCard);
            }}
          />
        </div>
      )}

      {editingProduct && (
        <div className="absolute inset-0 z-50 bg-white">
          <CreateProductScreen
            channels={channels}
            forms={forms}
            initialProduct={editingProduct}
            onBack={() => setEditingProduct(null)}
            onSave={async (product, selectedChannelUids) => {
              setProductsError(null);
              const savedProduct = await leadProductService.update(product.uid, product);
              const productForCard = {
                ...product,
                ...savedProduct,
                uid: savedProduct.uid || product.uid,
                name: savedProduct.name || product.name,
                displayName: savedProduct.displayName || product.displayName,
                defaultPipelineName: savedProduct.defaultPipelineName || product.defaultPipelineName,
                leadTemplateUid: savedProduct.leadTemplateUid || product.leadTemplateUid,
                leadTemplateName: savedProduct.leadTemplateName || product.leadTemplateName,
                templateTitle: savedProduct.templateTitle || product.templateTitle,
                description: savedProduct.description || product.description,
                productType: savedProduct.productType || product.productType,
                productTypeEnum: savedProduct.productTypeEnum || product.productTypeEnum,
                productEnum: savedProduct.productEnum || product.productEnum,
                status: savedProduct.status || product.status,
              };
              setProducts((current) => current.map((item) => item.uid === productForCard.uid ? productForCard : item));
              setChannels((current) =>
                current.map((channel) => {
                  if (selectedChannelUids.includes(channel.uid)) {
                    return { ...channel, productUid: productForCard.uid, productName: productForCard.name };
                  }
                  if (channel.productUid === productForCard.uid) {
                    const { productUid, productName, ...rest } = channel;
                    return rest;
                  }
                  return channel;
                }),
              );
              setEditingProduct(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
