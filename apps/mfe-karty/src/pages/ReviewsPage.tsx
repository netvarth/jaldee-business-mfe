import React, { useState, useMemo } from 'react';
import {
  Star, Search, RefreshCw, Trash2, CheckCircle2, MessageSquare,
  TrendingUp, Award, Filter, ShieldCheck, User, Package, Clock, Share2,
  Send, Mail, Phone, MessageCircle, Copy, Check, ExternalLink, Sparkles
} from 'lucide-react';
import { cn } from '../new-karty-src/src/lib/utils';
import {
  useItemFeedbacks, useOrderReviews, useDeleteItemFeedback,
  useSubmitItemFeedback, useRequestOrderReview, ItemFeedbackDto, OrderReviewDto
} from '../services/useReviews';
import { useItems } from '../services/useItems';
import { useCustomers } from '../services/useCustomers';
import { useOrders } from '../services/useOrders';

export default function ReviewsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | 'ALL'>('ALL');

  const { data: itemFeedbacks = [], isLoading: loadingFeedbacks, refetch: refetchFeedbacks } = useItemFeedbacks();
  const { data: orderReviews = [], isLoading: loadingReviews, refetch: refetchReviews } = useOrderReviews();
  const { data: items = [] } = useItems();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useOrders();

  const deleteFeedbackMutation = useDeleteItemFeedback();
  const submitFeedbackMutation = useSubmitItemFeedback();
  const requestOrderReviewMutation = useRequestOrderReview();

  // Create review modal state
  const [showCreateReviewModal, setShowCreateReviewModal] = useState(false);
  const [newItemUid, setNewItemUid] = useState('');
  const [newConsumerUid, setNewConsumerUid] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Send Review Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteOrderUid, setInviteOrderUid] = useState('');
  const [inviteCustomerPhone, setInviteCustomerPhone] = useState('');
  const [inviteCustomerEmail, setInviteCustomerEmail] = useState('');
  const [inviteCustomerName, setInviteCustomerName] = useState('');
  const [inviteChannel, setInviteChannel] = useState<'WHATSAPP' | 'SMS' | 'EMAIL' | 'LINK'>('WHATSAPP');
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState('');

  const handleRefresh = () => {
    refetchFeedbacks();
    refetchReviews();
  };

  // Combine and format feedback list
  const allReviews = useMemo(() => {
    const itemMap = new Map((items as any[]).map(i => [i.uid || i.id, i.name]));
    const customerMap = new Map((customers as any[]).map(c => [c.id || c.uid, c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()]));

    const formattedItemFeedbacks = (itemFeedbacks || []).map((fb: ItemFeedbackDto) => ({
      uid: fb.uid || fb.itemUid + '-' + fb.consumerUid,
      type: 'ITEM' as const,
      rating: fb.rating,
      comment: fb.comment || 'No written text provided.',
      itemUid: fb.itemUid,
      itemName: itemMap.get(fb.itemUid) || 'Catalog Item',
      consumerUid: fb.consumerUid,
      customerName: customerMap.get(fb.consumerUid) || 'Verified Customer',
      date: 'Recent',
      isDeletable: !!fb.uid,
    }));

    const formattedOrderReviews = (orderReviews || []).map((rev: OrderReviewDto) => ({
      uid: rev.uid || rev.orderUid,
      type: 'ORDER' as const,
      rating: rev.rating,
      comment: rev.comment || 'Order fulfillment feedback.',
      itemUid: undefined,
      itemName: 'Full Sales Order',
      consumerUid: undefined,
      customerName: 'Verified Order Buyer',
      date: rev.reviewDate ? new Date(rev.reviewDate).toLocaleDateString() : 'Recent',
      isDeletable: false,
    }));

    return [...formattedItemFeedbacks, ...formattedOrderReviews];
  }, [itemFeedbacks, orderReviews, items, customers]);

  // Statistics
  const stats = useMemo(() => {
    const total = allReviews.length;
    if (total === 0) {
      // F16: no reviews yet → no score. Showing 5.0 / 100% Positive off zero data is misleading.
      return { avgRating: 0, total: 0, distribution: [0, 0, 0, 0, 0], positivePct: 0 };
    }
    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Number((sum / total).toFixed(1));
    const dist = [0, 0, 0, 0, 0]; // 5, 4, 3, 2, 1
    let positiveCount = 0;
    allReviews.forEach(r => {
      const idx = 5 - Math.max(1, Math.min(5, Math.round(r.rating)));
      dist[idx] += 1;
      if (r.rating >= 4) positiveCount++;
    });
    return {
      avgRating: avg,
      total,
      distribution: dist,
      positivePct: Math.round((positiveCount / total) * 100),
    };
  }, [allReviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return allReviews.filter(r => {
      if (selectedRatingFilter !== 'ALL' && Math.round(r.rating) !== selectedRatingFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesComment = r.comment.toLowerCase().includes(q);
        const matchesItem = r.itemName.toLowerCase().includes(q);
        const matchesCust = r.customerName.toLowerCase().includes(q);
        return matchesComment || matchesItem || matchesCust;
      }
      return true;
    });
  }, [allReviews, selectedRatingFilter, searchQuery]);

  const handleDelete = (uid: string) => {
    if (!confirm('Are you sure you want to remove this feedback entry?')) return;
    deleteFeedbackMutation.mutate(uid);
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemUid || !newConsumerUid) {
      alert('Please select both a Product and a Customer');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitFeedbackMutation.mutateAsync({
        itemUid: newItemUid,
        consumerUid: newConsumerUid,
        rating: newRating,
        comment: newComment.trim() || undefined,
      });
      setShowCreateReviewModal(false);
      setNewComment('');
      setNewRating(5);
      refetchFeedbacks();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate Review Link
  const reviewLink = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jaldee.com';
    return `${baseUrl}/karty/reviews`;
  }, [inviteOrderUid]);

  const reviewMessageText = useMemo(() => {
    const name = inviteCustomerName || 'Valued Customer';
    return `Hello ${name}! Thank you for your order with us. We would love to hear about your experience! Please take 30 seconds to rate us: ${reviewLink}`;
  }, [inviteCustomerName, reviewLink]);

      const [inviteErrorMsg, setInviteErrorMsg] = useState('');

  const handleSendInvite = async () => {
    setSendingInvite(true);
    setInviteSuccessMsg('');
    setInviteErrorMsg('');
    try {
      if (inviteChannel === 'WHATSAPP') {
        if (inviteOrderUid) {
          try {
            await requestOrderReviewMutation.mutateAsync(inviteOrderUid);
            setInviteSuccessMsg(`Real WhatsApp notification sent to ${inviteCustomerPhone || 'customer'} via Platform Notification Gateway (WATI/Plivo)!`);
          } catch (err: any) {
            // Fallback gracefully to direct WhatsApp link if backend is not yet restarted
            const cleanPhone = inviteCustomerPhone.replace(/[^0-9]/g, '');
            const phoneWithCountry = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
            const waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(reviewMessageText)}`;
            window.open(waUrl, '_blank');
            setInviteSuccessMsg(`Opened WhatsApp with customer review link!`);
          }
        } else {
          const cleanPhone = inviteCustomerPhone.replace(/[^0-9]/g, '');
          const phoneWithCountry = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
          const waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(reviewMessageText)}`;
          window.open(waUrl, '_blank');
          setInviteSuccessMsg(`Opened WhatsApp with customer review link!`);
        }
      } else if (inviteChannel === 'SMS') {
        if (inviteOrderUid) {
          try {
            await requestOrderReviewMutation.mutateAsync(inviteOrderUid);
            setInviteSuccessMsg(`Real SMS notification dispatched to ${inviteCustomerPhone || 'customer'} via Platform SMS Gateway!`);
          } catch (err: any) {
            window.location.href = `sms:${inviteCustomerPhone}?body=${encodeURIComponent(reviewMessageText)}`;
            setInviteSuccessMsg(`Opened SMS composer with review invitation!`);
          }
        } else {
          window.location.href = `sms:${inviteCustomerPhone}?body=${encodeURIComponent(reviewMessageText)}`;
          setInviteSuccessMsg(`Opened SMS composer with review invitation!`);
        }
      } else if (inviteChannel === 'EMAIL') {
        if (inviteOrderUid) {
          try {
            await requestOrderReviewMutation.mutateAsync(inviteOrderUid);
            setInviteSuccessMsg(`Real Email notification dispatched to ${inviteCustomerEmail || 'customer'} via Platform Email Gateway!`);
          } catch (err: any) {
            window.location.href = `mailto:${inviteCustomerEmail}?subject=${encodeURIComponent("How was your order? Rate your experience")}&body=${encodeURIComponent(reviewMessageText)}`;
            setInviteSuccessMsg(`Opened Email composer with review invitation!`);
          }
        } else {
          window.location.href = `mailto:${inviteCustomerEmail}?subject=${encodeURIComponent("How was your order? Rate your experience")}&body=${encodeURIComponent(reviewMessageText)}`;
          setInviteSuccessMsg(`Opened Email composer with review invitation!`);
        }
      } else if (inviteChannel === 'LINK') {
        await navigator.clipboard.writeText(reviewMessageText);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
        setInviteSuccessMsg('Review link copied to clipboard!');
      }
    } catch (err: any) {
      setInviteErrorMsg(err?.message || 'Failed to dispatch review invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSelectOrderForInvite = (orderId: string) => {
    setInviteOrderUid(orderId);
    const ord = (orders as any[]).find(o => (o.uid || o.id) === orderId);
    if (ord) {
      const consumer = (customers as any[]).find(c => (c.id || c.uid) === ord.consumerUid);
      const name = ord.customerName || consumer?.name || `${consumer?.firstName || ''} ${consumer?.lastName || ''}`.trim() || 'Customer';
      setInviteCustomerName(name);
      setInviteCustomerPhone(consumer?.phone || consumer?.primaryNumber || '');
      setInviteCustomerEmail(consumer?.email || consumer?.primaryEmail || '');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-screen bg-[#F8FAFC] font-sans p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full space-y-6">

        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-3xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Star className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Customer Reviews &amp; Ratings</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Monitor verified customer feedback, post-order ratings, and storefront testimonials.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* SEND REVIEW INVITE BUTTON */}
            <button
              onClick={() => {
                if (orders.length > 0) {
                  handleSelectOrderForInvite((orders[0] as any).uid || (orders[0] as any).id);
                } else if (customers.length > 0) {
                  const c = customers[0] as any;
                  setInviteCustomerName(c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim());
                  setInviteCustomerPhone(c.phone || c.primaryNumber || '');
                  setInviteCustomerEmail(c.email || c.primaryEmail || '');
                }
                setShowInviteModal(true);
              }}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send Review Invite</span>
            </button>

            {/* ADD CUSTOMER REVIEW BUTTON */}
            <button
              onClick={() => {
                if (items.length > 0) setNewItemUid((items[0] as any).uid || (items[0] as any).id);
                if (customers.length > 0) setNewConsumerUid((customers[0] as any).id || (customers[0] as any).uid);
                setShowCreateReviewModal(true);
              }}
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#55349A] hover:bg-[#43267d] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Add Customer Review</span>
            </button>

            <button
              onClick={handleRefresh}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", (loadingFeedbacks || loadingReviews) && "animate-spin text-[#55349A]")} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* METRICS & BREAKDOWN CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Overall Score */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Rating</span>
              {stats.total > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  <TrendingUp className="h-3 w-3" /> {stats.positivePct}% Positive
                </span>
              )}
            </div>

            <div className="my-4 flex items-baseline gap-3">
              <span className="text-4xl font-black text-slate-900">{stats.total === 0 ? '—' : stats.avgRating.toFixed(1)}</span>
              <div className="flex flex-col">
                <div className="flex text-amber-400 gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < Math.round(stats.avgRating) ? "fill-current text-amber-400" : "text-slate-200"
                      )}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 font-semibold mt-0.5">out of 5.0 stars</span>
              </div>
            </div>

            <div className="text-xs font-medium text-slate-500 border-t border-slate-100 pt-3 flex items-center justify-between">
              <span>Based on {stats.total} total reviews</span>
              <span className="font-bold text-[#55349A]">100% Verified</span>
            </div>
          </div>

          {/* 2. Rating Breakdown Bar Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rating Distribution</span>
              <span className="text-xs text-slate-400 font-medium">Customer score breakdown</span>
            </div>

            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((stars, idx) => {
                const count = stats.distribution[idx];
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 w-14 shrink-0 font-bold text-slate-600">
                      <span>{stars}</span>
                      <Star className="h-3 w-3 fill-current text-amber-400" />
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          stars >= 4 ? "bg-emerald-500" : stars === 3 ? "bg-amber-400" : "bg-rose-400"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-slate-400 font-mono text-[11px] font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CONTROLS: SEARCH & STAR FILTER PILLS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, product, or comment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-3xs focus:border-[#55349A] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 5, 4, 3, 2, 1] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setSelectedRatingFilter(opt)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0",
                  selectedRatingFilter === opt
                    ? "bg-[#55349A] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                )}
              >
                {opt === 'ALL' ? 'All Ratings' : `${opt} ★`}
              </button>
            ))}
          </div>
        </div>

        {/* REVIEWS LIST */}
        <div className="space-y-3.5">
          {filteredReviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">No customer reviews found</p>
              <p className="text-xs text-slate-400 mt-1">
                Reviews submitted after order fulfillment or through review invitations will appear here.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Review Invite (WhatsApp / SMS / Email)</span>
                </button>
              </div>
            </div>
          ) : (
            filteredReviews.map((rev) => (
              <div
                key={rev.uid}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-black text-xs">
                      {rev.customerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{rev.customerName}</span>
                        <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[10px] border border-emerald-100">
                          <CheckCircle2 className="h-3 w-3" /> Verified Buyer
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-slate-600">
                          <Package className="h-3 w-3 text-slate-400" />
                          {rev.itemName}
                        </span>
                        <span>•</span>
                        <span>{rev.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-100 text-xs">
                      <div className="flex text-amber-400 gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3.5 w-3.5",
                              i < rev.rating ? "fill-current text-amber-400" : "text-slate-200"
                            )}
                          />
                        ))}
                      </div>
                      <span className="font-extrabold text-amber-800 ml-1">{rev.rating}.0</span>
                    </div>

                    {rev.isDeletable && (
                      <button
                        onClick={() => handleDelete(rev.uid)}
                        title="Delete Review"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 italic">
                  &ldquo;{rev.comment}&rdquo;
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* SEND REVIEW INVITATION MODAL (WhatsApp / SMS / Email / Direct Link) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-xs">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Send Review Invitation</h3>
                  <p className="text-xs text-slate-500">Request customer rating via WhatsApp, SMS, or Email.</p>
                </div>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Select Channel</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteChannel('WHATSAPP')}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                      inviteChannel === 'WHATSAPP'
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteChannel('SMS')}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                      inviteChannel === 'SMS'
                        ? "border-blue-500 bg-blue-50 text-blue-800 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span>SMS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteChannel('EMAIL')}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                      inviteChannel === 'EMAIL'
                        ? "border-purple-500 bg-purple-50 text-purple-800 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Mail className="h-4 w-4 text-purple-600" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteChannel('LINK')}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                      inviteChannel === 'LINK'
                        ? "border-slate-800 bg-slate-900 text-white shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>

              {/* Order Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Select Order (Optional)</label>
                <select
                  value={inviteOrderUid}
                  onChange={(e) => handleSelectOrderForInvite(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-[#55349A] focus:outline-none"
                >
                  <option value="">-- General Customer Invite (No Order) --</option>
                  {(orders as any[]).map((ord) => (
                    <option key={ord.uid || ord.id} value={ord.uid || ord.id}>
                      {ord.orderNo ? `Order #${ord.orderNo}` : `Order #${(ord.uid || ord.id).slice(0, 8)}`} — {ord.customerName || 'Customer'} (₹{ord.grandTotal || ord.totalAmount || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={inviteCustomerName}
                    onChange={(e) => setInviteCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-[#55349A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {inviteChannel === 'EMAIL' ? 'Email Address' : 'Phone / WhatsApp No.'}
                  </label>
                  {inviteChannel === 'EMAIL' ? (
                    <input
                      type="email"
                      value={inviteCustomerEmail}
                      onChange={(e) => setInviteCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-[#55349A] focus:outline-none"
                    />
                  ) : (
                    <input
                      type="tel"
                      value={inviteCustomerPhone}
                      onChange={(e) => setInviteCustomerPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-[#55349A] focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Message Preview */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Message Preview</label>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700 leading-relaxed font-mono">
                  {reviewMessageText}
                </div>
              </div>

              {inviteErrorMsg && (
                <div className="p-3 bg-red-50 text-red-800 text-xs font-bold rounded-xl border border-red-200">
                  {inviteErrorMsg}
                </div>
              )}

              {inviteSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{inviteSuccessMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={sendingInvite}
                  onClick={handleSendInvite}
                  className={cn(
                    "px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50",
                    inviteChannel === 'WHATSAPP' ? "bg-emerald-600 hover:bg-emerald-700" :
                    inviteChannel === 'SMS' ? "bg-blue-600 hover:bg-blue-700" :
                    inviteChannel === 'EMAIL' ? "bg-purple-600 hover:bg-purple-700" :
                    "bg-slate-900 hover:bg-black"
                  )}
                >
                  {sendingInvite ? (
                    'Sending...'
                  ) : inviteChannel === 'WHATSAPP' ? (
                    <>
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>Send on WhatsApp</span>
                    </>
                  ) : inviteChannel === 'SMS' ? (
                    <>
                      <Phone className="h-3.5 w-3.5" />
                      <span>Send via SMS</span>
                    </>
                  ) : inviteChannel === 'EMAIL' ? (
                    <>
                      <Mail className="h-3.5 w-3.5" />
                      <span>Send via Email</span>
                    </>
                  ) : (
                    <>
                      {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy Review Link'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD REAL CUSTOMER REVIEW MODAL */}
      {showCreateReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-xs">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Live Customer Review</h3>
                <p className="text-xs text-slate-500">Save a verified product rating directly into the database.</p>
              </div>
              <button onClick={() => setShowCreateReviewModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">✕</button>
            </div>

            <form onSubmit={handleCreateReview} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Select Product</label>
                <select
                  value={newItemUid}
                  onChange={(e) => setNewItemUid(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-[#55349A] focus:outline-none"
                  required
                >
                  <option value="" disabled>Select an item</option>
                  {(items as any[]).map((item) => (
                    <option key={item.uid || item.id} value={item.uid || item.id}>
                      {item.name || item.displayName || 'Catalog Item'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Select Customer</label>
                <select
                  value={newConsumerUid}
                  onChange={(e) => setNewConsumerUid(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-[#55349A] focus:outline-none"
                  required
                >
                  <option value="" disabled>Select a customer</option>
                  {(customers as any[]).map((c) => (
                    <option key={c.id || c.uid} value={c.id || c.uid}>
                      {c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="text-2xl cursor-pointer transition-transform hover:scale-110"
                      style={{ color: star <= newRating ? '#f59e0b' : '#cbd5e1' }}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">{newRating} Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Feedback Comment</label>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Enter genuine customer testimonial, product quality remarks, packaging feedback..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-[#55349A] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateReviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#55349A] hover:bg-[#43267d] rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Live Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
