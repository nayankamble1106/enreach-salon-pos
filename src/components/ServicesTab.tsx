import React, { useState } from 'react';
import { SalonService, Stylist, CartItem } from '../types';
import {
  Clock,
  Plus,
  Check,
  ArrowRight,
  Search,
  X,
  Pencil,
  Trash2,
  FolderPlus,
  Tag,
  IndianRupee,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { PinLockModal } from './PinLockModal';

interface ServicesTabProps {
  services: SalonService[];
  stylists: Stylist[];
  selectedStylistId?: string;
  onSelectStylist?: (stylistId: string) => void;
  cartItems: CartItem[];
  onAddToCart: (service: SalonService, stylist: Stylist) => void;
  onUpdateCartQuantity?: (serviceId: string, delta: number) => void;
  currencySymbol: string;
  onGoToCart: () => void;
  // Dynamic Service Manager Actions
  onAddService: (newService: SalonService) => void;
  onUpdateService: (updatedService: SalonService) => void;
  onDeleteService: (serviceId: string) => void;
  customCategories?: string[];
  onAddCategory?: (categoryName: string) => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({
  services,
  stylists,
  selectedStylistId,
  cartItems,
  onAddToCart,
  currencySymbol,
  onGoToCart,
  onAddService,
  onUpdateService,
  onDeleteService,
  customCategories = [],
  onAddCategory,
}) => {
  // State for Service Manager Edit Mode and PIN prompt
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  // Modals for Editing and Adding
  const [editingService, setEditingService] = useState<SalonService | null>(null);
  const [addServiceForCategory, setAddServiceForCategory] = useState<string | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState<boolean>(false);
  const [serviceToDelete, setServiceToDelete] = useState<SalonService | null>(null);

  // Category and Search Filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract all categories dynamically in order of appearance + custom categories
  // Enforce Tab 1: "All", Tab 2: "Common Services", Tab 3: "Hair Services", followed by remaining categories
  const rawCategories = Array.from(
    new Set([...services.map((srv) => srv.category), ...(customCategories || [])])
  );
  const remainingCategories = rawCategories.filter(
    (cat) => cat !== 'Common Services' && cat !== 'Hair Services'
  );
  const categories = ['All', 'Common Services', 'Hair Services', ...remainingCategories];

  // Active stylist for bill addition
  const activeStylist =
    (stylists && stylists.find((s) => s.id === selectedStylistId)) ||
    (stylists && stylists[0]) || {
      id: 'staff-1',
      name: 'Kunal',
      role: 'Stylist',
    };

  // Toggle Edit Services Switch handler
  const handleToggleSwitch = () => {
    if (isEditMode) {
      // Turn OFF immediately
      setIsEditMode(false);
    } else {
      // Prompt 4-digit PIN (default '1234')
      setIsPinModalOpen(true);
    }
  };

  const handlePinSuccess = () => {
    setIsPinModalOpen(false);
    setIsEditMode(true);
  };

  // Form states for modals
  const [serviceFormName, setServiceFormName] = useState('');
  const [serviceFormPrice, setServiceFormPrice] = useState('');
  const [serviceFormCategory, setServiceFormCategory] = useState('');
  const [serviceFormDuration, setServiceFormDuration] = useState('');
  const [formError, setFormError] = useState('');

  // Open Edit Service Modal
  const openEditModal = (service: SalonService) => {
    setEditingService(service);
    setServiceFormName(service.name);
    setServiceFormPrice(String(service.price));
    setServiceFormCategory(service.category);
    setServiceFormDuration(service.duration ? String(service.duration) : '');
    setFormError('');
  };

  const handleSaveEditService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    const name = serviceFormName.trim();
    const price = parseFloat(serviceFormPrice);

    if (!name) {
      setFormError('Please enter service name.');
      return;
    }
    if (isNaN(price) || price < 0) {
      setFormError('Please enter a valid price (₹).');
      return;
    }

    const duration = serviceFormDuration.trim() ? parseInt(serviceFormDuration, 10) : undefined;
    const category = serviceFormCategory.trim() || editingService.category;

    const updated: SalonService = {
      ...editingService,
      name,
      price,
      category,
      duration: isNaN(duration as number) ? undefined : duration,
    };

    onUpdateService(updated);
    setEditingService(null);
  };

  // Open Add Service Modal
  const openAddServiceModal = (category: string) => {
    setAddServiceForCategory(category);
    setServiceFormName('');
    setServiceFormPrice('');
    setServiceFormCategory(category);
    setServiceFormDuration('');
    setFormError('');
  };

  const handleSaveNewService = (e: React.FormEvent) => {
    e.preventDefault();
    const name = serviceFormName.trim();
    const price = parseFloat(serviceFormPrice);
    const category = serviceFormCategory.trim() || addServiceForCategory || 'General';

    if (!name) {
      setFormError('Please enter service name.');
      return;
    }
    if (isNaN(price) || price < 0) {
      setFormError('Please enter a valid price (₹).');
      return;
    }

    const duration = serviceFormDuration.trim() ? parseInt(serviceFormDuration, 10) : undefined;
    const newService: SalonService = {
      id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      price,
      category,
      duration: isNaN(duration as number) ? undefined : duration,
    };

    onAddService(newService);
    setAddServiceForCategory(null);
  };

  // Add Category State & Handler
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCatInitialServiceName, setNewCatInitialServiceName] = useState('');
  const [newCatInitialServicePrice, setNewCatInitialServicePrice] = useState('');
  const [categoryModalError, setCategoryModalError] = useState('');

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const catName = newCategoryName.trim();
    if (!catName) {
      setCategoryModalError('Please enter a category name.');
      return;
    }
    if (rawCategories.some((c) => c.toLowerCase() === catName.toLowerCase())) {
      setCategoryModalError('This category already exists.');
      return;
    }

    if (onAddCategory) {
      onAddCategory(catName);
    }

    // If initial service details provided, add first service too
    const sName = newCatInitialServiceName.trim();
    const sPrice = parseFloat(newCatInitialServicePrice);
    if (sName && !isNaN(sPrice) && sPrice >= 0) {
      const initialService: SalonService = {
        id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: sName,
        price: sPrice,
        category: catName,
      };
      onAddService(initialService);
    }

    setSelectedCategory(catName);
    setIsAddCategoryOpen(false);
    setNewCategoryName('');
    setNewCatInitialServiceName('');
    setNewCatInitialServicePrice('');
    setCategoryModalError('');
  };

  // Confirm delete service handler
  const handleConfirmDelete = () => {
    if (serviceToDelete) {
      onDeleteService(serviceToDelete.id);
      setServiceToDelete(null);
    }
  };

  // Determine which categories to display based on filter & search
  const categoriesToRender =
    selectedCategory === 'All'
      ? rawCategories
      : rawCategories.filter((c) => c === selectedCategory);

  const q = searchQuery.toLowerCase().trim();

  return (
    <div className="space-y-6">
      {/* Top Bar: Service Manager Toggle Switch & Status */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
              isEditMode
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {isEditMode ? <Pencil className="w-5 h-5 text-amber-700" /> : <Lock className="w-5 h-5 text-slate-500" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Services Catalog</h2>
              {isEditMode ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  EDIT MODE ON
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {services.length} Total Services
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditMode
                ? 'Pencil (✏️) to edit price/name, Trash (🗑️) to delete, + Add Service & Categories.'
                : 'Standard POS selection mode. Toggle switch to modify prices or add services.'}
            </p>
          </div>
        </div>

        {/* Edit Services Toggle Switch with 4-Digit PIN Security */}
        <div className="flex items-center gap-3 self-end sm:self-center bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl">
          <label htmlFor="edit-services-toggle" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
            Edit Services
          </label>
          <button
            id="edit-services-toggle"
            type="button"
            role="switch"
            aria-checked={isEditMode}
            onClick={handleToggleSwitch}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
              isEditMode ? 'bg-amber-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isEditMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Services Menu Header: Category Filter Chips & Compact Search Box */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Horizontal Category Filter Tabs */}
        <div className="flex-1 overflow-hidden min-w-0">
          <div
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1 pt-0.5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => {
              const count = cat === 'All' ? services.length : services.filter((s) => s.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedCategory === cat ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact Search Bar */}
        <div className="relative shrink-0 w-full sm:w-56 md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 text-xs font-medium text-slate-900 placeholder-slate-400 rounded-xl pl-9 pr-8 py-2.5 outline-none transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Render Category Sections */}
      <div className="space-y-8">
        {categoriesToRender.map((category) => {
          const categoryServices = services.filter((srv) => srv.category === category);
          const filteredCategoryServices = categoryServices.filter((srv) => {
            if (!q) return true;
            return (
              srv.name.toLowerCase().includes(q) ||
              (srv.description && srv.description.toLowerCase().includes(q)) ||
              srv.category.toLowerCase().includes(q)
            );
          });

          // If searching and this category has no matching services, hide in search results unless it's the only selected tab
          if (q && filteredCategoryServices.length === 0 && selectedCategory === 'All') {
            return null;
          }

          return (
            <section
              key={category}
              className="bg-white/80 rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs transition-all space-y-4"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">{category}</h3>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {categoryServices.length} {categoryServices.length === 1 ? 'service' : 'services'}
                  </span>
                </div>

                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => openAddServiceModal(category)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-700" />
                    <span>+ Add Service</span>
                  </button>
                )}
              </div>

              {/* Grid of Services in this Category */}
              {filteredCategoryServices.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  {q ? (
                    <p>No services matching &ldquo;{q}&rdquo; in {category}.</p>
                  ) : (
                    <p>No services in this category yet.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCategoryServices.map((service) => {
                    const inCart = cartItems.find((item) => item.service.id === service.id);

                    return (
                      <div
                        key={service.id}
                        className={`bg-white rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all relative ${
                          isEditMode
                            ? 'border-amber-200/90 shadow-2xs hover:border-amber-400 hover:shadow-xs'
                            : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {service.category}
                            </span>

                            {/* Service Card Top Controls: In Edit Mode render ✏️ and 🗑️ icons; in standard mode render duration */}
                            {isEditMode ? (
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-lg p-0.5 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(service);
                                  }}
                                  className="p-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-100 rounded-md transition-colors cursor-pointer"
                                  title="Edit Service Name & Price (✏️)"
                                  aria-label={`Edit ${service.name}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setServiceToDelete(service);
                                  }}
                                  className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                                  title="Delete Service (🗑️)"
                                  aria-label={`Delete ${service.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : service.duration ? (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{service.duration} mins</span>
                              </div>
                            ) : null}
                          </div>

                          <h4 className="font-bold text-slate-900 text-base leading-snug">{service.name}</h4>
                          {service.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {service.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Price</span>
                            <span className="text-lg font-bold text-slate-900">
                              {currencySymbol}
                              {service.price.toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* In Edit Mode: user can also click Edit; in Standard Mode: Add to Bill button */}
                          {isEditMode ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(service)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3 h-3 text-amber-700" />
                              <span>Edit</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddToCart(service, activeStylist)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                inCart
                                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                              }`}
                            >
                              {inCart ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Added ({inCart.quantity})</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add to Bill</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* b. '+ Add Service' button at the bottom of every existing category section */}
              {isEditMode && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => openAddServiceModal(category)}
                    className="w-full py-3 px-4 border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50/90 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs group"
                  >
                    <Plus className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform" />
                    <span>+ Add Service to {category}</span>
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* c. '+ Add New Category' button at the bottom of the Services tab */}
      {isEditMode && (
        <div className="pt-4 pb-2 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setIsAddCategoryOpen(true);
              setNewCategoryName('');
              setNewCatInitialServiceName('');
              setNewCatInitialServicePrice('');
              setCategoryModalError('');
            }}
            className="w-full sm:w-auto min-w-[280px] py-3.5 px-6 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-slate-700 group"
          >
            <FolderPlus className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>+ Add New Category (e.g., Products, Spa)</span>
          </button>
        </div>
      )}

      {/* Floating Bottom Bar if Cart has items (Standard Mode) */}
      {cartItems.length > 0 && !isEditMode && (
        <div className="sticky bottom-20 md:bottom-6 z-30 flex justify-end">
          <button
            type="button"
            onClick={onGoToCart}
            className="flex items-center gap-3 bg-amber-700 hover:bg-amber-800 text-white px-5 py-3 rounded-xl shadow-lg font-semibold text-sm transition-all cursor-pointer"
          >
            <span>Proceed to Billing ({cartItems.reduce((a, b) => a + b.quantity, 0)} items)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PIN Security Modal for Edit Mode Toggle (4-Digit PIN, default '1234') */}
      <PinLockModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        requiredPin="1234"
        pinLength={4}
        title="Service Manager Access"
        description="Enter confidential 4-digit manager PIN to unlock service pricing & catalog editing."
      />

      {/* Modal: Edit Service (Pencil ✏️) */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setEditingService(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Edit Service</h3>
                <p className="text-xs text-slate-500">Update service name and price in catalog</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditService} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={serviceFormName}
                  onChange={(e) => setServiceFormName(e.target.value)}
                  placeholder="e.g., Girls Haircut"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price ({currencySymbol}) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={serviceFormPrice}
                    onChange={(e) => setServiceFormPrice(e.target.value)}
                    placeholder="400"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={serviceFormCategory}
                    onChange={(e) => setServiceFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {rawCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={serviceFormDuration}
                    onChange={(e) => setServiceFormDuration(e.target.value)}
                    placeholder="e.g., 30"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Service (+ Add Service) */}
      {addServiceForCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setAddServiceForCategory(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Add New Service</h3>
                <p className="text-xs text-slate-500">Adding to category: <span className="font-bold text-amber-900">{addServiceForCategory}</span></p>
              </div>
            </div>

            <form onSubmit={handleSaveNewService} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={serviceFormName}
                  onChange={(e) => setServiceFormName(e.target.value)}
                  placeholder="e.g., Keratin Hair Treatment"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price ({currencySymbol}) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={serviceFormPrice}
                    onChange={(e) => setServiceFormPrice(e.target.value)}
                    placeholder="500"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={serviceFormCategory}
                    onChange={(e) => setServiceFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {rawCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={serviceFormDuration}
                    onChange={(e) => setServiceFormDuration(e.target.value)}
                    placeholder="e.g., 45"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAddServiceForCategory(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Add Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Category (+ Add New Category) */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsAddCategoryOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Add New Category</h3>
                <p className="text-xs text-slate-500">Create a new service category section</p>
              </div>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              {categoryModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{categoryModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Name *
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setCategoryModalError('');
                    }}
                    placeholder="e.g., Products, Spa, Bridal Packages"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Optional: Add First Service in this Category
                </span>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Name</label>
                  <input
                    type="text"
                    value={newCatInitialServiceName}
                    onChange={(e) => setNewCatInitialServiceName(e.target.value)}
                    placeholder="e.g., Swedish Full Body Massage"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price ({currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newCatInitialServicePrice}
                      onChange={(e) => setNewCatInitialServicePrice(e.target.value)}
                      placeholder="1500"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation (Trash 🗑️) */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-slate-900 text-center">Delete Service?</h3>
            <p className="text-xs text-slate-500 mt-1.5 text-center leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-800">&ldquo;{serviceToDelete.name}&rdquo;</span> (₹{serviceToDelete.price})?
              This will remove it from the catalog across all connected devices.
            </p>

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="flex-1 py-2.5 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                Delete Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
