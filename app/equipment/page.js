'use client';
import GlobalFooter from '@/app/components/GlobalFooter';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GoldPurchasePrompt from '@/app/components/GoldPurchasePrompt';
import { trackEquipmentViewed, trackEquipmentPurchased, trackGoldPurchaseViewed } from '@/lib/analytics';

export default function EquipmentPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);
  const [userEquipment, setUserEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showGoldPrompt, setShowGoldPrompt] = useState(false);

  useEffect(() => {
    loadUserData();
    // Track equipment page view
    trackEquipmentViewed();
  }, []);

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Check if user is premium
      if (profileData.subscription_status !== 'active') {
        router.push('/dashboard');
        return;
      }

      loadEquipment(user);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadEquipment(userData) {
    try {
      // Use passed user data or state
      const userId = userData?.id || user?.id;
      if (!userId) return;

      // Load equipment catalog
      const { data: catalog } = await supabase
        .from('equipment_catalog')
        .select('*')
        .order('required_level', { ascending: true });

      setEquipmentCatalog(catalog || []);

      // Load user's equipment
      const { data: userEquip } = await supabase
        .from('user_equipment')
        .select('*, equipment:equipment_catalog(*)')
        .eq('user_id', userId);

      setUserEquipment(userEquip || []);
    } catch (error) {
      console.error('Error loading equipment:', error);
    }
  }

  function hasEquipment(equipmentId) {
    return userEquipment.some(ue => ue.equipment_id === equipmentId);
  }

  function isEquipped(equipmentId) {
    return profile.equipped_weapon === equipmentId ||
           profile.equipped_armor === equipmentId ||
           profile.equipped_accessory === equipmentId;
  }

  async function unlockEquipment(equipment) {
    if (profile.level < equipment.required_level) {
      alert(`You need to reach level ${equipment.required_level} to unlock this equipment!`);
      return;
    }

    if (profile.gold < equipment.gold_price) {
      // Show gold purchase prompt instead of alert
      setShowGoldPrompt(true);
      trackGoldPurchaseViewed();
      return;
    }

    // Confirm purchase
    const confirmed = confirm(`Purchase ${equipment.name} for ${equipment.gold_price} gold?`);
    if (!confirmed) return;

    try {
      // SECURITY: Use server-side API for equipment purchase
      const response = await fetch('/api/purchase-equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ equipment_id: equipment.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to purchase equipment:', data.error);
        alert(data.message || 'Failed to purchase equipment');
        return;
      }

      // Track equipment purchase
      trackEquipmentPurchased({
        id: equipment.id,
        name: equipment.name,
        gold_price: equipment.gold_price,
        slot: equipment.slot,
      });

      alert(`Successfully purchased ${equipment.name}!\n\n-${data.cost} gold\nNew balance: ${data.new_balance} gold`);

      // Reload equipment and profile
      loadEquipment();

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);
    } catch (error) {
      console.error('Error unlocking equipment:', error);
      alert('Failed to unlock equipment');
    }
  }

  async function equipItem(equipment) {
    try {
      const columnName = `equipped_${equipment.slot}`;

      const { error } = await supabase
        .from('profiles')
        .update({ [columnName]: equipment.id })
        .eq('id', user.id);

      if (error) throw error;

      // Update is_equipped in user_equipment
      await supabase
        .from('user_equipment')
        .update({ is_equipped: false })
        .eq('user_id', user.id)
        .eq('equipment_id', profile[columnName]);

      await supabase
        .from('user_equipment')
        .update({ is_equipped: true })
        .eq('user_id', user.id)
        .eq('equipment_id', equipment.id);

      loadEquipment();

      // Reload profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);
    } catch (error) {
      console.error('Error equipping item:', error);
      alert('Failed to equip item');
    }
  }

  async function unequipItem(equipment) {
    try {
      const columnName = `equipped_${equipment.slot}`;

      const { error } = await supabase
        .from('profiles')
        .update({ [columnName]: null })
        .eq('id', user.id);

      if (error) throw error;

      await supabase
        .from('user_equipment')
        .update({ is_equipped: false })
        .eq('user_id', user.id)
        .eq('equipment_id', equipment.id);

      loadEquipment();

      // Reload profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);
    } catch (error) {
      console.error('Error unequipping item:', error);
      alert('Failed to unequip item');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'bg-gray-600 border-gray-500';
      case 'rare': return 'bg-blue-600 border-blue-500';
      case 'epic': return 'bg-purple-600 border-purple-500';
      case 'legendary': return 'bg-yellow-600 border-yellow-500';
      default: return 'bg-gray-600 border-gray-500';
    }
  };

  const filteredEquipment = activeTab === 'all'
    ? equipmentCatalog
    : equipmentCatalog.filter(e => e.slot === activeTab);

  const totalXPBonus = userEquipment
    .filter(ue => isEquipped(ue.equipment_id))
    .reduce((sum, ue) => sum + (parseFloat(ue.equipment.xp_multiplier) - 1.0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Equipment Shop</h1>
            <p className="text-gray-300">Unlock and equip gear to boost your XP gains</p>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <span className="text-yellow-400 font-bold text-xl">{profile?.gold || 0} Gold</span>
              </div>
              {totalXPBonus > 0 && (
                <p className="text-yellow-400 font-semibold">
                  Current XP Bonus: +{(totalXPBonus * 100).toFixed(0)}%
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/shop')} className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-semibold">
              Buy Gold
            </button>
            <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Currently Equipped */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Currently Equipped</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {['weapon', 'armor', 'accessory'].map(slot => {
              const equippedId = profile[`equipped_${slot}`];
              const equipped = equipmentCatalog.find(e => e.id === equippedId);

              return (
                <div key={slot} className="bg-gray-700/50 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-2 uppercase">{slot}</h3>
                  {equipped ? (
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{equipped.icon_emoji}</span>
                      <div className="flex-1">
                        <div className="font-bold">{equipped.name}</div>
                        <div className="text-sm text-gray-400">+{((equipped.xp_multiplier - 1.0) * 100).toFixed(0)}% XP</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">No {slot} equipped</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'weapon', 'armor', 'accessory'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-semibold ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Equipment Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipment.map((equipment) => {
            const owned = hasEquipment(equipment.id);
            const equipped = isEquipped(equipment.id);
            const canUnlock = profile.level >= equipment.required_level;

            return (
              <div
                key={equipment.id}
                className={`border-2 rounded-xl p-6 ${getRarityColor(equipment.rarity)} ${
                  !canUnlock ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-5xl">{equipment.icon_emoji}</span>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      equipment.rarity === 'common' ? 'bg-gray-800' :
                      equipment.rarity === 'rare' ? 'bg-blue-800' :
                      equipment.rarity === 'epic' ? 'bg-purple-800' :
                      'bg-yellow-800'
                    }`}>
                      {equipment.rarity}
                    </div>
                    <div className="text-sm text-gray-300 mt-1">Lvl {equipment.required_level}</div>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2">{equipment.name}</h3>
                <p className="text-sm text-gray-300 mb-4">{equipment.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 uppercase">{equipment.slot}</span>
                    <span className="text-yellow-400 font-bold">
                      +{((equipment.xp_multiplier - 1.0) * 100).toFixed(0)}% XP
                    </span>
                  </div>
                  {!owned && (
                    <div className="flex items-center justify-between border-t border-gray-600 pt-2">
                      <span className="text-gray-400">Cost:</span>
                      <span className="text-yellow-400 font-bold flex items-center gap-1">
                        <span>💰</span>{equipment.gold_price} Gold
                      </span>
                    </div>
                  )}
                </div>

                {equipped ? (
                  <button
                    onClick={() => unequipItem(equipment)}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
                  >
                    Unequip
                  </button>
                ) : owned ? (
                  <button
                    onClick={() => equipItem(equipment)}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
                  >
                    Equip
                  </button>
                ) : canUnlock ? (
                  <button
                    onClick={() => unlockEquipment(equipment)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-semibold"
                  >
                    Purchase for {equipment.gold_price} Gold
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full px-4 py-3 bg-gray-700 text-gray-500 rounded-lg font-semibold cursor-not-allowed"
                  >
                    Locked (Lvl {equipment.required_level})
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Gold Purchase Prompt */}
        <GoldPurchasePrompt
          show={showGoldPrompt}
          onClose={() => setShowGoldPrompt(false)}
          trigger="insufficient_gold"
          currentGold={profile?.gold || 0}
        />
      <GlobalFooter />
      </div>
    </div>
  );
}
