import React, { useState } from 'react';
import { SalonService, Stylist, CartItem } from '../types';
import { Clock, Plus, Check, ArrowRight } from 'lucide-react';

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
}

export const ServicesTab: React.FC<ServicesTabProps> = ({
  services,
  stylists,
  selectedStylistId,
  cartItems,
  onAddToCart,
  currencySymbol,
  onGoToCart,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Dynamically extract all categories from dataset in exact order of appearance + 'All'
  const categories = ['All', ...Array.from(new Set(services.map((srv) => srv.category)))];

  const filteredServices = services.filter((srv) => {
    return selectedCategory === 'All' || srv.category === selectedCategory;
  });

  const activeStylist =
    (stylists && stylists.find((s) => s.id === selectedStylistId)) ||
    (stylists && stylists[0]) || {
      id: 'staff-1',
      name: 'Kunal',
      role: 'Stylist',
    };

  return (
    <div className="space-y-6">
      {/* Horizontal Category Filter Tabs */}
      <div className="w-full overflow-hidden">
        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1 pt-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => {
          const inCart = cartItems.find((item) => item.service.id === service.id);

          return (
            <div
              key={service.id}
              className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {service.category}
                  </span>
                  {service.duration ? (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{service.duration} mins</span>
                    </div>
                  ) : null}
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug">{service.name}</h3>
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
                    {currencySymbol}{service.price.toLocaleString('en-IN')}
                  </span>
                </div>

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
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Bar if Cart has items */}
      {cartItems.length > 0 && (
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
    </div>
  );
};
