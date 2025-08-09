import { Github, Check, X, Scale } from "lucide-react";

const LICENSE_NAME = "GNU General Public License v3.0";
const GITHUB_URL = "https://github.com/Sandipeyy/NepoFlix";

// Reusable Card Component
const Card = ({ color, border, children }) => (
  <div className={`rounded-xl p-6 border ${color} ${border}`}>
    {children}
  </div>
);

// Data Arrays
const permissions = [
  "Use NepoFlix for completely free",
  "Share the website with friends and family",
  "Learn how NepoFlix works under the hood",
  "Request features or report bugs",
];

const restrictions = [
  "You cannot take NepoFlix's code, modify it, and release it under a different license or as closed-source software.",
  "You cannot use NepoFlix's code for commercial purposes without following GPL-3.0 terms.",
  "You cannot remove credits or claim you made the project from scratch.",
];

const obligations = [
  "You must keep the same license (GPL-3.0) if you distribute modified versions of NepoFlix.",
  "You must make your source code available if you publicly use or modify NepoFlix.",
  "You must credit the original authors (like the NepoFlix team) when redistributing.",
];

export default function OpenSource() {
  return (
    <main className="bg-black text-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">📖 Open Source License</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            NepoFlix is fully open-source and licensed under the{" "}
            <span className="text-green-400 font-semibold">{LICENSE_NAME}</span>. 
            This means you can use, study, modify, and share the code — but there are rules.
          </p>
        </header>

        {/* Sections */}
        <section className="grid md:grid-cols-3 gap-6">
          {/* What You CAN Do */}
          <Card color="bg-green-500/10" border="border-green-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Check className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-green-400">What You CAN Do ✅</h2>
            </div>
            <ul className="space-y-2">
              {permissions.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          {/* What You CANNOT Do */}
          <Card color="bg-red-500/10" border="border-red-500/20">
            <div className="flex items-center gap-2 mb-4">
              <X className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-red-400">What You CANNOT Do ❌</h2>
            </div>
            <ul className="space-y-2">
              {restrictions.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          {/* Your Obligations */}
          <Card color="bg-yellow-500/10" border="border-yellow-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-yellow-400">Your Obligations 📜</h2>
            </div>
            <ul className="space-y-2">
              {obligations.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Scale className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-gray-400 mb-6">
            For full legal details, read the{" "}
            <a
              href="https://www.gnu.org/licenses/gpl-3.0.en.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:underline"
              title="Read the official GPL-3.0 license"
            >
              official GPL-3.0 license
            </a>.
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gray-800 px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            title="View NepoFlix source code on GitHub"
          >
            <Github className="w-5 h-5" />
            View on GitHub
          </a>
        </footer>
      </div>
    </main>
  );
}
