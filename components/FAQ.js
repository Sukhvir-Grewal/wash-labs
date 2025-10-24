import { useState } from "react";

const FAQ_ENTRIES = [
  {
    question: "How long does a full detail usually take?",
    answer: "Plan for about two to three hours. We confirm the schedule with you so it fits your day and keep you posted if anything runs long.",
  },
  {
    question: "Do I need to supply water or power?",
    answer: "Yes we will need water and electric outlet.",
  },
  {
    question: "What if it rains on my appointment day?",
    answer: "We keep an eye on the forecast. If the weather looks rough, we reach out to reschedule or move the service to a covered spot.",
  },
  {
    question: "Which payment methods do you accept?",
    answer: "We accept tap or chip cards, Apple Pay, and cash.If needed Invoices are emailed for easy record keeping.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="bg-blue-50 py-20 px-4 text-blue-900">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-500">FAQ</p>
          <h2 className="text-4xl sm:text-5xl font-bold mt-3" style={{ color: '#000' }}>Common Questions</h2>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 divide-y divide-blue-100">
          {FAQ_ENTRIES.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(prev => (prev === index ? -1 : index))}
                  className="w-full flex items-center justify-between gap-6 px-6 py-5 text-left text-blue-900 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-base sm:text-lg font-semibold tracking-tight" style={{ color: '#000' }}>{item.question}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 text-sm font-bold text-blue-600 bg-blue-50">
                    {isOpen ? "-" : "+"}
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-[max-height] duration-300 ease-out ${isOpen ? 'max-h-40' : 'max-h-0'}`}
                >
                  <p className="px-6 pb-5 text-sm sm:text-base text-blue-700 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
