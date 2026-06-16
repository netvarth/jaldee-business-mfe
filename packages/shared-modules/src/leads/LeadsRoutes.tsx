import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ChannelDetailScreen from "./screens/ChannelDetailScreen";
import CreateProductScreen from "./screens/CreateProductScreen";
import LeadDetailScreen from "./screens/LeadDetailScreen";
import PipelineDetailScreen from "./screens/PipelineDetailScreen";
import ProductDetailScreen from "./screens/ProductDetailScreen";
import TemplateBuilderScreen from "./screens/TemplateBuilderScreen";
import { PipelineBuilder } from "./screens/PipelineBuilder";
import type { Channel, CrmLeadDto, CrmLeadPipelineDto, CrmLeadPipelineStageDto, FormTemplate, LeadStageTask, Product } from "./types";
import { leadPipelineService } from "./services/pipelineService";
import { leadProductService } from "./services/productService";
import { leadService } from "./services/leadService";

export function PipelineDetailRoute({
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
      leadPipelineService
        .detail(pipelineUid)
        .then((detailed) => {
          setPipeline(detailed);
          setPipelines((prev) => prev.map((old) => (old.uid === pipelineUid ? detailed : old)));
        })
        .catch((err) => console.error("Failed to load pipeline detail:", err));
    }
  }, [pipelineUid, setPipelines]);

  if (!pipeline) return null;

  return (
    <PipelineDetailScreen
      pipeline={pipeline}
      leads={leads}
      onBack={() => navigate("/leads/pipelines")}
      onNavigate={onNavigate}
      onEdit={() =>
        navigate(`/leads/pipelines/${pipeline.uid}/edit`, {
          state: { returnTo: `/leads/pipelines/${pipeline.uid}/matrix` },
        })
      }
    />
  );
}

export function PipelineEditRoute({
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
  const returnPath = returnTo?.startsWith("/leads/pipelines/") ? returnTo : "/leads/pipelines";

  useEffect(() => {
    if (!pipelineUid) return;
    let active = true;
    setIsLoadingPipeline(true);
    leadPipelineService
      .detail(pipelineUid)
      .then((detailed) => {
        if (!active) return;
        const pipelineForEdit = {
          ...pipelineState,
          ...detailed,
          stages: detailed.stages?.length ? detailed.stages : pipelineState?.stages ?? [],
        };
        setPipeline(pipelineForEdit);
        setPipelines((prev) =>
          prev.some((old) => old.uid === pipelineForEdit.uid) ? prev.map((old) => (old.uid === pipelineForEdit.uid ? pipelineForEdit : old)) : [pipelineForEdit, ...prev]
        );
      })
      .catch((err) => {
        console.error("Failed to load pipeline for editing:", err);
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
        setPipelines((prev) => (prev.some((old) => old.uid === p.uid) ? prev.map((old) => (old.uid === p.uid ? p : old)) : [p, ...prev]));
        try {
          const updatedPipelines = await leadPipelineService.search({}, { page: 0, size: 100 });
          if (updatedPipelines && updatedPipelines.length > 0) {
            setPipelines(updatedPipelines);
          }
        } catch (err) {
          console.error("Failed to refetch pipelines after save:", err);
        }
        navigate(returnPath);
      }}
    />
  );
}

export function TemplateEditRoute({
  forms,
  setForms,
  refreshTemplates,
}: {
  forms: FormTemplate[];
  setForms: React.Dispatch<React.SetStateAction<FormTemplate[]>>;
  refreshTemplates?: () => Promise<FormTemplate[] | void> | void;
}) {
  const navigate = useNavigate();
  const { templateUid } = useParams();
  const template = forms.find((item) => item.uid === templateUid) ?? null;

  return (
    <TemplateBuilderScreen
      initialTemplate={template}
      onSave={async (updatedTemplate) => {
        setForms((prev) => [updatedTemplate, ...prev.filter((item) => item.uid !== updatedTemplate.uid)]);
        await refreshTemplates?.();
        navigate("/leads/templates");
      }}
    />
  );
}

function mergeLeadStageTasks(...taskGroups: LeadStageTask[][]): LeadStageTask[] {
  const byUid = new Map<string, LeadStageTask>();
  taskGroups.flat().forEach((task) => {
    if (!task.uid) return;
    const existing = byUid.get(task.uid);
    byUid.set(task.uid, existing ? { ...existing, ...task } : task);
  });
  return Array.from(byUid.values());
}

function stageDetailTasks(stage: CrmLeadPipelineStageDto | null): LeadStageTask[] {
  return (stage?.taskTemplates ?? []).map((task, index) => ({
    uid: String(task.uid || `stage-task-${index + 1}`),
    title: task.title || `Task ${index + 1}`,
    type: task.type || "TASK",
    required: task.required ?? true,
    completed: false,
    isManual: false,
    createdAt: "",
    priority: task.priority,
    description: task.description,
  }));
}

export function LeadDetailRoute({
  leads,
  pipelines,
  products,
  setLeads,
  setPipelines,
}: {
  leads: CrmLeadDto[];
  pipelines: CrmLeadPipelineDto[];
  products: Product[];
  onNavigate: (route: string, selection?: unknown) => void;
  setLeads: React.Dispatch<React.SetStateAction<CrmLeadDto[]>>;
  setPipelines: React.Dispatch<React.SetStateAction<CrmLeadPipelineDto[]>>;
}) {
  const navigate = useNavigate();
  const { leadUid } = useParams();
  const lead = leads.find((l) => l.uid === leadUid) ?? null;
  const [isLoadingLead, setIsLoadingLead] = useState(Boolean(leadUid && !lead));

  useEffect(() => {
    if (!leadUid) return;

    let active = true;

    async function loadLeadDetails() {
      setIsLoadingLead(true);
      try {
        const leadDetail = await leadService.detail(leadUid, { force: true });
        const stageUid = leadDetail.currentPipelineStageUid || lead?.currentPipelineStageUid;
        const [stageDetail, tenantTasks] = await Promise.all([
          stageUid ? leadPipelineService.stageDetail(stageUid) : Promise.resolve(null),
          leadService.getLeadTenantTasks(leadUid, { force: true }),
        ]);

        if (!active) return;

        const existingTasks = leadDetail.stageTasks ?? [];
        const existingTaskById = new Map(existingTasks.map((task) => [task.uid, task]));
        const currentStageTasks = stageDetailTasks(stageDetail).map((task) => ({
          ...task,
          isManual: false,
          completed: existingTaskById.get(task.uid)?.completed ?? task.completed,
        }));
        const existingManualTasks = existingTasks.filter((task) => task.isManual);
        const stageDrivenTasks = currentStageTasks.length ? currentStageTasks : existingTasks.filter((task) => !task.isManual);
        const mergedTasks = mergeLeadStageTasks(stageDrivenTasks, existingManualTasks, tenantTasks);
        const hydratedLead = { ...leadDetail, stageTasks: mergedTasks };

        setLeads((prev) => {
          const exists = prev.some((item) => item.uid === hydratedLead.uid);
          return exists ? prev.map((item) => (item.uid === hydratedLead.uid ? hydratedLead : item)) : [...prev, hydratedLead];
        });
      } catch (err) {
        console.error("Failed to load lead detail tasks:", err);
      } finally {
        if (active) setIsLoadingLead(false);
      }
    }

    loadLeadDetails();

    return () => {
      active = false;
    };
  }, [leadUid, lead?.currentPipelineStageUid, setLeads]);

  useEffect(() => {
    if (!lead?.pipelineUid) return;

    const pipelineState = pipelines.find((p) => p.uid === lead.pipelineUid);
    if (pipelineState?.stages?.length) return;

    let active = true;
    leadPipelineService
      .detail(lead.pipelineUid)
      .then((detailed) => {
        if (!active) return;
        setPipelines((prev) =>
          prev.some((old) => old.uid === detailed.uid) ? prev.map((old) => (old.uid === detailed.uid ? { ...old, ...detailed } : old)) : [detailed, ...prev]
        );
      })
      .catch((err) => console.error("Failed to load lead pipeline stages:", err));

    return () => {
      active = false;
    };
  }, [lead?.pipelineUid, pipelines, setPipelines]);

  if (!lead) {
    return (
      <div className="h-full overflow-y-auto bg-slate-50 p-6 text-sm text-slate-600">
        {isLoadingLead ? "Loading lead..." : "Lead not found."}
      </div>
    );
  }

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
          navigate("/leads/list");
        }
      }}
      onUpdate={(updatedLead) => {
        setLeads((prev) => prev.map((l) => (l.uid === updatedLead.uid ? updatedLead : l)));
      }}
    />
  );
}

export function ChannelDetailRoute({
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
      onBack={() => navigate("/leads/channels")}
      onNavigate={onNavigate}
    />
  );
}

export function ChannelEditRoute({
  products,
  channels,
  setChannels,
  availableLocations,
}: {
  products: Product[];
  channels: Channel[];
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  availableLocations: BranchLocation[];
}) {
  const { channelUid } = useParams();
  const navigate = useNavigate();
  const [channel, setChannel] = React.useState<Channel | null>(
    () => channels.find((item) => item.uid === channelUid) ?? null
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const cachedChannel = channels.find((item) => item.uid === channelUid) ?? null;

    if (cachedChannel) {
      setChannel(cachedChannel);
      return;
    }

    if (!channelUid) return;

    setLoading(true);
    setError(null);
    leadChannelService
      .detail(channelUid)
      .then((loadedChannel) => {
        if (cancelled) return;
        setChannel(loadedChannel);
        setChannels((prev) => [loadedChannel, ...prev.filter((item) => item.uid !== loadedChannel.uid)]);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load channel for editing:", err);
        setError("Channel not found.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [channelUid, channels, setChannels]);

  if (loading && !channel) {
    return <div className="p-6 text-sm text-slate-500">Loading channel...</div>;
  }

  if (error || !channel) {
    return <div className="p-6 text-sm text-slate-500">{error || "Channel not found."}</div>;
  }

  return (
    <CreateChannelScreen
      products={products}
      initialChannel={channel}
      onBack={() => navigate("/leads/channels")}
      onSave={async (updatedChannel) => {
        await leadChannelService.update(channel.uid, updatedChannel, availableLocations);
        const latestChannels = await leadChannelService.search();
        setChannels(latestChannels);
        navigate("/leads/channels");
      }}
    />
  );
}

export function ProductDetailRoute({
  products,
  setProducts,
  leads,
  pipelines,
  setPipelines,
  channels,
  onNavigate,
}: {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  leads: CrmLeadDto[];
  pipelines: CrmLeadPipelineDto[];
  setPipelines: React.Dispatch<React.SetStateAction<CrmLeadPipelineDto[]>>;
  channels: Channel[];
  onNavigate: (route: string, selection?: { type: string; id: string }) => void;
}) {
  const navigate = useNavigate();
  const { productUid } = useParams();
  const productState = products.find((p) => p.uid === productUid) ?? null;
  const [product, setProduct] = useState<Product | null>(productState);

  useEffect(() => {
    if (!productUid) return;
    let active = true;
    leadProductService
      .detail(productUid)
      .then((detail) => {
        if (!active) return;
        setProduct(detail);
        setProducts((prev) => (prev.some((item) => item.uid === detail.uid) ? prev.map((item) => (item.uid === detail.uid ? detail : item)) : [detail, ...prev]));
      })
      .catch((err) => console.error("Failed to load product detail:", err));

    return () => {
      active = false;
    };
  }, [productUid, setProducts]);

  useEffect(() => {
    if (!product) return;

    const pipelineState =
      pipelines.find((item) => item.uid === product.defaultPipelineUid) ||
      pipelines.find((item) => item.productUids?.includes(product.uid)) ||
      pipelines.find((item) => item.name === product.defaultPipelineName);

    if (!pipelineState?.uid || pipelineState.stages?.length) return;

    let active = true;
    leadPipelineService
      .detail(pipelineState.uid)
      .then((detail) => {
        if (!active) return;
        const pipelineForInventory = {
          ...pipelineState,
          ...detail,
          stages: detail.stages?.length ? detail.stages : pipelineState.stages ?? [],
        };
        setPipelines((prev) =>
          prev.some((item) => item.uid === pipelineForInventory.uid)
            ? prev.map((item) => (item.uid === pipelineForInventory.uid ? pipelineForInventory : item))
            : [pipelineForInventory, ...prev]
        );
      })
      .catch((err) => console.error("Failed to load product pipeline stages:", err));

    return () => {
      active = false;
    };
  }, [product, pipelines, setPipelines]);

  if (!product) return <div className="shell-loading">Loading product...</div>;

  return (
    <ProductDetailScreen
      product={product}
      leads={leads}
      pipelines={pipelines}
      channels={channels}
      onBack={() => navigate("/leads/products")}
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
        setProducts((prev) => prev.map((item) => (item.uid === productForCard.uid ? productForCard : item)));
        setProduct(productForCard);
      }}
    />
  );
}

export function ProductEditRoute({
  products,
  setProducts,
  channels,
  setChannels,
  forms,
  pipelines,
}: {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  channels: Channel[];
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  forms: FormTemplate[];
  pipelines: CrmLeadPipelineDto[];
}) {
  const navigate = useNavigate();
  const { productUid } = useParams();
  const productState = products.find((p) => p.uid === productUid) ?? null;
  const [product, setProduct] = useState<Product | null>(productState);
  const [isLoadingProduct, setIsLoadingProduct] = useState(Boolean(productUid));

  useEffect(() => {
    if (!productUid) return;
    let active = true;
    setIsLoadingProduct(true);

    leadProductService
      .detail(productUid)
      .then((detail) => {
        if (!active) return;
        setProduct(detail);
        setProducts((prev) => (prev.some((item) => item.uid === detail.uid) ? prev.map((item) => (item.uid === detail.uid ? detail : item)) : [detail, ...prev]));
      })
      .catch((err) => {
        console.error("Failed to load product for editing:", err);
        if (active && productState) setProduct(productState);
      })
      .finally(() => {
        if (active) setIsLoadingProduct(false);
      });

    return () => {
      active = false;
    };
  }, [productUid, setProducts]);

  if (isLoadingProduct) {
    return <div className="shell-loading">Loading product...</div>;
  }

  if (!product) return null;

  return (
    <CreateProductScreen
      channels={channels}
      forms={forms}
      pipelines={pipelines}
      initialProduct={product}
      onBack={() => navigate("/leads/products")}
      onSave={async (updatedProduct, selectedChannelUids) => {
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
        setProducts((current) =>
          current.some((item) => item.uid === productForCard.uid) ? current.map((item) => (item.uid === productForCard.uid ? productForCard : item)) : [productForCard, ...current]
        );
        setChannels((current) =>
          current.map((channel) => {
            if (selectedChannelUids.includes(channel.uid)) {
              return { ...channel, productUid: productForCard.uid, productName: productForCard.name };
            }
            if (channel.productUid === productForCard.uid) {
              const { productUid: _productUid, productName: _productName, ...rest } = channel;
              return rest;
            }
            return channel;
          })
        );
        navigate("/leads/products");
      }}
    />
  );
}
import type { BranchLocation } from "@jaldee/auth-context";
import CreateChannelScreen from "./screens/CreateChannelScreen";
import { leadChannelService } from "./services/channelService";
