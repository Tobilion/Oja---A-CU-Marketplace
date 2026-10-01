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

// Each thread plays for roughly a minute at the hero pacing before the
// next scene starts. Naira amounts and rules stay honest: under ₦10,000
// and under 5 items per seller is ₦500 delivery, otherwise ₦1,000;
// same-hall sellers get 50% off their combined fee; Oja holds payment
// until the buyer confirms delivery; the delivery code confirms handover.
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
      { kind: "buyer", text: "Can you deliver to Joseph Hall, Block C?" },
      { kind: "seller", text: "Yes, Joseph Hall is on my route this evening." },
      { kind: "card", variant: "delivery-code", title: "Your delivery code", body: "7 3 9 0", highlight: "delivery" },
      { kind: "buyer", text: "The runner just called. Sharing the code with him now." },
      { kind: "seller", text: "Confirmed, laptop handed over. Please confirm delivery so Oja releases the payment.", highlight: "verified" },
      { kind: "buyer", text: "Confirmed! It is exactly as described." },
      { kind: "buyer", text: "Thank you! Verified seller, so I am relaxed.", highlight: "tutor" }
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
      { kind: "buyer", text: "Paid. The money stays held by Oja, right?" },
      { kind: "seller", text: "Yes. It stays held until you confirm both deliveries." },
      { kind: "card", variant: "order-placed", title: "Order placed", body: "Seller confirmed. Ready tomorrow." },
      { kind: "seller", text: "Perfect. I will pack it neatly." },
      { kind: "card", variant: "delivery-code", title: "Your delivery code", body: "4 8 2 1", highlight: "delivery" },
      { kind: "buyer", text: "How do I confirm delivery?" },
      { kind: "seller", text: "Open your orders and tap confirm delivery." },
      { kind: "buyer", text: "Both arrived! Cakes are perfect." },
      { kind: "seller", text: "Thank you! A rating helps my store a lot." },
      { kind: "buyer", text: "Received! Cake looks amazing. 5 stars.", highlight: "tutor" }
    ]
  },
  {
    sellerAvatarId: "fashion",
    sellerName: "Amara, thrift",
    items: [
      { kind: "buyer", text: "Good afternoon! Is the thrift bundle still available?" },
      { kind: "seller", text: "Afternoon! Yes. 5 pieces, all medium size." },
      { kind: "buyer", text: "₦6,500 for all 5?" },
      { kind: "seller", text: "Yes. Fixed price, already discounted." },
      { kind: "buyer", text: "I will take it. Delivery to Esther Hall?", highlight: "fashion" },
      { kind: "card", variant: "delivery-fee", title: "Delivery fee", body: "₦500 to Esther Hall", highlight: "delivery" },
      { kind: "card", variant: "payment-held", title: "Payment held by Oja", body: "Released to the seller only after you confirm delivery", highlight: "verified" },
      { kind: "card", variant: "order-placed", title: "Order placed", body: "Seller confirmed. Ready today." },
      { kind: "seller", text: "Packed and ready. The runner comes this evening." },
      { kind: "card", variant: "delivery-code", title: "Your delivery code", body: "2 6 0 4", highlight: "delivery" },
      { kind: "buyer", text: "Bundle received, everything fits!" },
      { kind: "seller", text: "Enjoy! A rating helps my store a lot." },
      { kind: "buyer", text: "5 stars. Verified sellers only from now on.", highlight: "verified" }
    ]
  }
];
