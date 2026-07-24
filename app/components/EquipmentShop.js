'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase-client';
import { RARITY_COLORS, RARITY_GLOW } from '@/lib/equipment-constants';
import EmptyState from './EmptyState';

function EquipmentCard({ item, owned, equipped, gold, onPurchase, onEquip }) {
  const canAfford = gold >= item.gold_price;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={
        'relative p-4 rounded-candy border-2 transition-all ' +
        (equipped
          ? `border-[${RARITY_COLORS[item.rarity]}] shadow-candy bg-white`
          : owned
          ? 'border-emerald bg-white'
          : 'border-stone bg-white hover:border-hero-blue')
      }
    >
      {equipped && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-gold text-navy rounded-full text-xs font-black">
          ✓ EQUIPPED
        </div>
      )}

      <div className="text-center">
        <div className="text-5xl mb-3">{item.emoji || '⚡'}</div>

        <h3
          className="text-lg font-black mb-1"
          style={{ color: RARITY_COLORS[item.rarity] }}
        >
          {item.name}
        </h3>

        <p className="text-xs text-navy/60 mb-3 min-h-[40px]">{item.description}</p>

        {/* Stats. The live catalog stores the XP bonus in the xp_multiplier
            column (stat_bonus JSONB is null there), so fall back to it —
            same precedence complete-quest uses when awarding XP. */}
        {(() => {
          const xpMult = parseFloat(item.stat_bonus?.xp_multiplier ?? item.xp_multiplier ?? 1.0);
          const hasXP = !Number.isNaN(xpMult) && xpMult > 1.0;
          const hasOther = item.stat_bonus?.gold_bonus || item.stat_bonus?.streak_protection;
          if (!hasXP && !hasOther) return null;
          return (
            <div className="mb-3 p-2 bg-cream rounded-xl text-xs space-y-1">
              {hasXP && (
                <p className="text-hero-blue font-bold">
                  +{((xpMult - 1) * 100).toFixed(0)}% XP
                </p>
              )}
              {item.stat_bonus?.gold_bonus && (
                <p className="text-navy font-bold">
                  +{((item.stat_bonus.gold_bonus - 1) * 100).toFixed(0)}% Gold
                </p>
              )}
              {item.stat_bonus?.streak_protection && (
                <p className="text-emerald font-bold">Momentum Protection</p>
              )}
            </div>
          );
        })()}

        {/* Price/Actions */}
        {!owned ? (
          <button
            onClick={() => canAfford && onPurchase(item)}
            disabled={!canAfford}
            className={
              canAfford
                ? 'kq-btn kq-btn-gold w-full disabled:opacity-50'
                : 'w-full py-2 px-4 rounded-full font-black text-sm border-2 border-stone bg-stone/40 text-navy/40 cursor-not-allowed'
            }
          >
            {canAfford ? `💰 ${item.gold_price} Gold` : `🔒 ${item.gold_price} Gold`}
          </button>
        ) : !equipped ? (
          <button
            onClick={() => onEquip(item)}
            className="kq-btn kq-btn-emerald w-full"
          >
            Equip
          </button>
        ) : (
          <button
            onClick={() => onEquip(null, item.type)}
            className="kq-btn kq-btn-ghost w-full"
          >
            Unequip
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function EquipmentShop({ isPremium, gold, onGoldChange, onEquipmentChange }) {
  const [catalog, setCatalog] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [equipped, setEquipped] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    if (isPremium) {
      loadEquipment();
    }
  }, [isPremium]);

  // Welcome Quest chain step 4: browsing the shop counts as the visit
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        fetch('/api/onboarding/shop-visited', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
      } catch {
        // best-effort
      }
    })();
  }, []);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load catalog
      const { data: catalogData } = await supabase
        .from('equipment_catalog')
        .select('*')
        .eq('is_active', true)
        .order('rarity', { ascending: false })
        .order('gold_price', { ascending: true });

      setCatalog(catalogData || []);

      // Load user inventory
      const { data: inventoryData } = await supabase
        .from('user_equipment')
        .select('*, equipment:equipment_catalog(*)')
        .eq('user_id', session.user.id);

      setInventory(inventoryData || []);

      // Extract equipped items
      const equippedItems = {};
      inventoryData?.forEach((item) => {
        if (item.equipped && item.equipment) {
          equippedItems[item.equipment.type] = item.equipment;
        }
      });
      setEquipped(equippedItems);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item) => {
    if (gold < item.gold_price) {
      alert("You don't have enough gold!");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Deduct gold
      const { error: goldError } = await supabase
        .from('profiles')
        .update({ gold: gold - item.gold_price })
        .eq('id', session.user.id);

      if (goldError) throw goldError;

      // Add to inventory
      const { error: invError } = await supabase
        .from('user_equipment')
        .insert({
          user_id: session.user.id,
          equipment_id: item.id,
          equipped: false,
        });

      if (invError) throw invError;

      // Update local state
      if (onGoldChange) onGoldChange(gold - item.gold_price);
      loadEquipment();
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to purchase item');
    }
  };

  const handleEquip = async (item, unequipType = null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const type = unequipType || item?.type;

      // Unequip current item of this type
      await supabase
        .from('user_equipment')
        .update({ equipped: false })
        .eq('user_id', session.user.id)
        .in(
          'equipment_id',
          catalog.filter((e) => e.type === type).map((e) => e.id)
        );

      // Equip new item (if not just unequipping)
      if (item) {
        await supabase
          .from('user_equipment')
          .update({ equipped: true })
          .eq('user_id', session.user.id)
          .eq('equipment_id', item.id);
      }

      loadEquipment();
      onEquipmentChange?.();
    } catch (error) {
      console.error('Equip error:', error);
      alert('Failed to equip item');
    }
  };

  if (!isPremium) return null;

  if (loading) {
    return (
      <div className="kq-card p-8 text-center">
        <p className="text-navy font-bold">Loading equipment shop...</p>
      </div>
    );
  }

  const types = ['all', 'weapon', 'armor', 'accessory', 'companion_skin'];
  const filteredCatalog =
    selectedType === 'all'
      ? catalog
      : catalog.filter((item) => item.type === selectedType);

  const ownedIds = inventory.map((i) => i.equipment_id);

  return (
    <div className="kq-card p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="kq-display text-2xl text-coral">
            ⚔️ Equipment Shop
          </h2>
          <div className="px-4 py-2 bg-gold border-2 border-navy/10 rounded-full font-black text-navy">
            💰 {gold} Gold
          </div>
        </div>
        <p className="text-navy/60 text-sm">
          Enhance your hero with fun gear and companions
        </p>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={
              selectedType === type
                ? 'kq-chip border-2 bg-coral text-white border-coral'
                : 'kq-chip border-2 bg-cream text-navy/70 border-stone hover:border-coral'
            }
          >
            {type === 'all' ? 'All' : type.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Equipment Grid */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredCatalog.map((item) => (
          <EquipmentCard
            key={item.id}
            item={item}
            owned={ownedIds.includes(item.id)}
            equipped={equipped[item.type]?.id === item.id}
            gold={gold}
            onPurchase={handlePurchase}
            onEquip={handleEquip}
          />
        ))}
      </div>

      {filteredCatalog.length === 0 && (
        <EmptyState
          icon="🛠️"
          title="The blacksmith's shelves are bare"
          description="Nothing in this category yet. Check back soon, or browse everything else the shop has to offer."
          actionLabel="Show All Gear"
          onAction={() => setSelectedType('all')}
        />
      )}
    </div>
  );
}
