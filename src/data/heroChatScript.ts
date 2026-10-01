// src/data/heroChatScript.ts
export type ChatItem =
  | { kind: "buyer"; text: string; highlight?: string }
  | { kind: "seller"; text: string; highlight?: string }
  | { kind: "card"; variant: "payment-held" | "order-placed" | "delivery-code" | "delivery-fee"; title: string; body: string; highlight?: string };

export interface ChatScene {
  sellerAvatarId: string;
  sellerName: string;
  items: ChatItem[];
}

export const chatScenes: ChatScene[] = [
  {
    sellerAvatarId: "laptop",
    sellerName: "Tunde, laptops",
    items: [
      { kind: "buyer", text: "Good evening, is the laptop still available?" },
      { kind: "seller", text: "Evening! Yes. i5, 8GB RAM, 256GB SSD, battery lasts about 5 hours." },
      { kind: "buyer", text: "What is your last price?" },
      { kind: "seller", text: "Listed at ₦260,000. For you, ₦250,000." },
      { kind: "buyer", text: "Deal. Can I pay when it gets to my room?", highlight: "laptop" },
      { kind: "seller", text: "Yes, pay on delivery. You check it first, nothing is handed over until payment clears." },
      { kind: "card", variant: "delivery-fee", title: "Delivery fee", body: "₦1,000 to Peter Hall", highlight: "delivery" },
      { kind: "card", variant: "order-placed", title: "Order placed", body: "Seller confirmed. Ready in 1 day.", highlight: "baker" },
      { kind: "seller", text: "Packing it now. Please charge it before the inspection." },
      { kind: "buyer", text: "Thank you! Verified seller, so I am relaxed.", highlight: "verified" }
    ]
  },
  {
    sellerAvatarId: "baker",
    sellerName: "Ada, cakes",
    items: [
      { kind: "buyer", text: "Hi! Two small cakes for Friday, please." },
      { kind: "seller", text: "Sure! ₦8,500 for both. I can have them ready tomorrow." },
      { kind: "buyer", text: "Also ordering a rechargeable fan from the hostel seller. We are both in Joseph Hall.", highlight: "hostel" },
      { kind: "card", variant: "delivery-fee", title: "Same-hall discount", body: "Two sellers in one hall: combined delivery fee cut by 50%", highlight: "thrift" },
      { kind: "card", variant: "payment-held", title: "Payment held by Oja", body: "Released to sellers only after you confirm delivery", highlight: "verified" },
      { kind: "seller", text: "Perfect. I will pack it neatly." },
      { kind: "card", variant: "delivery-code", title: "Your delivery code", body: "4 8 2 1", highlight: "delivery" },
      { kind: "buyer", text: "Received! Cake looks amazing. 5 stars.", highlight: "tutor" }
    ]
  }
];
