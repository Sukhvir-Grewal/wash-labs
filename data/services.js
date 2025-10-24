export const SERVICES = [
  {
    id: "premium-exterior-wash",
    title: "Premium Exterior Wash",
    summary: "Foam bath, hand-finish, and wheel shine for showroom gloss.",
    basePrice: 50,
    revivePrice: 80,
    durationMinutes: 60,
    features: [
      { text: "Foam bath & hand wash", base: "✅", revive: "✅" },
      { text: "Wheel faces and tires cleaned", base: "✅", revive: "✅" },
      { text: "Tire shine applied", base: "✅", revive: "✅" },
      { text: "Spot-free hand dry", base: "✅", revive: "✅" },
      { text: "Ceramic sealant upgrade", base: "❌", revive: "✅" },
      { text: "Wheel barrels decontaminated", base: "❌", revive: "✅" },
      { text: "Glass polished inside and out", base: "❌", revive: "✅" },
    ],
  },
  {
    id: "complete-interior-detail",
    title: "Complete Interior Detail",
    summary: "Deep clean from carpets to vents with steam and extraction.",
    basePrice: 100,
    revivePrice: 140,
    durationMinutes: 120,
    features: [
      { text: "Deep vacuum and hot steam cleanse", base: "✅", revive: "✅" },
      { text: "Carpet and fabric extraction", base: "✅", revive: "✅" },
      { text: "Leather care & UV conditioning", base: "✅", revive: "✅" },
      { text: "Interior glass polished", base: "✅", revive: "✅" },
      { text: "Ozone odor neutralizing", base: "❌", revive: "✅" },
      { text: "Seat shampoo and conditioning", base: "❌", revive: "✅" },
      { text: "Trim reconditioning", base: "❌", revive: "✅" },
    ],
  },
  {
    id: "ultimate-full-detail",
    title: "Ultimate Full Detail",
    summary: "Inside and out reset for vehicles that deserve the works.",
    basePrice: 150,
    revivePrice: 210,
    durationMinutes: 180,
    features: [
      { text: "Premium exterior wash inclusions", base: "✅", revive: "✅" },
      { text: "Complete interior detail process", base: "✅", revive: "✅" },
      { text: "Dedicated finish inspection", base: "✅", revive: "✅" },
      { text: "Sealant plus interior protection", base: "❌", revive: "✅" },
      { text: "Engine bay refresh", base: "❌", revive: "✅" },
      { text: "Hydrophobic glass treatment", base: "❌", revive: "✅" },
    ],
  },
  {
    id: "subscription",
    title: "Subscription",
    summary: "Stay tuned for flexible plans that keep your ride fresh all year.",
    comingSoon: true,
    basePrice: null,
    revivePrice: null,
    durationMinutes: null,
    features: [],
  },
];

export function getServiceById(id) {
  return SERVICES.find(service => service.id === id);
}
