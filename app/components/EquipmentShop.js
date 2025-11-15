'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase-client';

const RARITY_COLORS = {
  common: '#9CA3AF',
  rare: '#00D4FF',
  epic: '#9333EA',
  legendary: '#FFD93D',
};

const RARITY_GLOW = {
  common: 'rgba(156,163,175,0.3)',
  rare: 'rgba(0,212,255,0.4)',
  epic: 'rgba(147,51,234,0.5)',
  legendary: 'rgba(255,217,61,0.6)',
};

function EquipmentCard({ item, owned, equipped, gold, onPurchase, onEquip }) {
  const canAfford = gold >= item.gold_price;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={
        'p-4 rounded-lg border-2 transition-all ' +
        (equipped
          ? `border-[${RARITY_COLORS[item.rarity]}] shadow-[0_0_20px_${RARITY_GLOW[item.rarity]}] bg-gradient-to-br from-[#0F3460] to-[#1A1A2E]`
          : owned
          ? 'border-[#48BB78] bg-[#0F3460]'
          : 'border-[#1A1A2E] bg-[#0F3460] hover:border-[#00D4FF]')
      }
    >
      {equipped && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-[#FFD93D] text-[#1A1A2E] rounded-full text-xs font-black">
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

        <p className="text-xs text-gray-300 mb-3 min-h-[40px]">{item.description}</p>

        {/* Stats */}
        {item.stat_bonus && Object.keys(item.stat_bonus).length > 0 && (
          <div className="mb-3 p-2 bg-[#1A1A2E] rounded text-xs space-y-1">
            {item.stat_bonus.xp_multiplier && (
              <p className="text-[#00D4FF] font-bold">
                +{((item.stat_bonus.xp_multiplier - 1) * 100).toFixed(0)}% XP
              </p>
            )}
            {item.stat_bonus.gold_bonus && (
              <p className="text-[#FFD93D] font-bold">
                +{((item.stat_bonus.gold_bonus - 1) * 100).toFixed(0)}% Gold
              </p>
            )}
            {item.stat_bonus.streak_protection && (
              <p className="text-[#48BB78] font-bold">Streak Protection</p>
            )}
          </div>
        )}

        {/* Price/Actions */}
        {!owned ? (
          <button
            onClick={() => canAfford && onPurchase(item)}
            disabled={!canAfford}
            className={
              'w-full py-2 px-4 rounded font-black text-sm border-2 transition-all ' +
              (canAfford
                ? 'bg-[#FFD93D] border-[#0F3460] text-[#0F3460] hover:scale-105'
                : 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed')
            }
          >
            {canAfford ? `💰 ${item.gold_price} Gold` : `🔒 ${item.gold_price} Gold`}
          </button>
        ) : !equipped ? (
          <button
            onClick={() => onEquip(item)}
            className="w-full py-2 px-4 rounded font-black text-sm bg-[#48BB78] border-2 border-[#0F3460] text-white hover:scale-105 transition-all"
          >
            Equip
          </button>
        ) : (
          <button
            onClick={() => onEquip(null, item.type)}
            className="w-full py-2 px-4 rounded font-black text-sm bg-gray-600 border-2 border-gray-700 text-gray-300 hover:bg-gray-500 transition-all"
          >
            Unequip
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function EquipmentShop({ isPremium, gold, onGoldChange }) {
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
    } catch (error) {
      console.error('Equip error:', error);
      alert('Failed to equip item');
    }
  };

  if (!isPremium) return null;

  if (loading) {
    return (
      <div className="bg-[#1A1A2E] border-3 border-[#FF6B6B] rounded-lg p-8 text-center">
        <p className="text-white font-bold">Loading equipment shop...</p>
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
    <div className="bg-[#1A1A2E] border-3 border-[#FF6B6B] rounded-lg p-6 shadow-[0_0_20px_rgba(255,107,107,0.3)]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-black text-[#FF6B6B] uppercase tracking-wide">
            ⚔️ Equipment Shop
          </h2>
          <div className="px-4 py-2 bg-[#FFD93D] border-3 border-[#0F3460] rounded-lg font-black text-[#0F3460]">
            💰 {gold} Gold
          </div>
        </div>
        <p className="text-gray-300 text-sm">
          Enhance your hero with legendary gear and companions
        </p>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={
              'px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ' +
              (selectedType === type
                ? 'bg-[#FF6B6B] border-[#FF6B6B] text-white'
                : 'bg-[#0F3460] border-gray-600 text-gray-300 hover:border-[#FF6B6B]')
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
        <div className="text-center py-16">
          <p className="text-gray-400">No equipment in this category yet</p>
        </div>
      )}
    </div>
  );
}
