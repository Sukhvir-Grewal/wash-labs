export const SERVICES = [
    {
        id: "premium-exterior-wash",
        title: "Premium Exterior Wash",
        summary: "Foam bath, hand-finish, and wheel shine for showroom gloss.",
        basePrice: 50,
        revivePrice: 80,
        durationMinutes: 60,
        baseFeatures: [
            "Foam bath & hand wash",
            "Wheel faces and tires cleaned",
            "Tire shine applied",
            "Spot-free hand dry",
            "Glass polished inside and out",
        ],
        reviveFeatures: ["Ceramic sealant upgrade", "Basic decontamination"],
    },
    {
        id: "complete-interior-detail",
        title: "Complete Interior Detail",
        summary: "Deep clean from carpets to vents with steam and extraction.",
        basePrice: 100,
        revivePrice: 140,
        durationMinutes: 120,
        baseFeatures: [
            "Deep vacuum and hot steam cleanse",
            "Interior & Exterior glass polished",
            "Carpet Cleaning",
            "UV Surface Protection",
        ],
        reviveFeatures: [
            "Ozone odor neutralizing",
            "Seat shampoo and conditioning",
            "Carpet and fabric extraction",
            "Leather Conditioning",
        ],
    },
    {
        id: "ultimate-full-detail",
        title: "Ultimate Full Detail",
        summary: "Inside and out reset for vehicles that deserve the works.",
        basePrice: 150,
        revivePrice: 180,
        durationMinutes: 180,
        baseFeatures: [
            "Premium exterior wash inclusions",
            "Complete interior detail process",
            "Dedicated finish inspection",
        ],
        reviveFeatures: [
            "Ceramic Sealant plus interior protection",
            "Basic Decontamination",
            "Light pet hair removal",
        ],
    },
    {
        id: "subscription",
        title: "Subscription",
        summary:
            "Stay tuned for flexible plans that keep your ride fresh all year.",
        comingSoon: true,
        basePrice: null,
        revivePrice: null,
        durationMinutes: null,
        baseFeatures: [],
        reviveFeatures: [],
    },
];

export function getServiceById(id) {
    return SERVICES.find((service) => service.id === id);
}
