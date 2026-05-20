import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  BookOpen,
  Brain,
  FileText,
  Lightbulb,
  Loader2,
  MessageSquare,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { extractPdfText } from "@/lib/pdf";
import { askStudyAI } from "@/lib/study.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — AI Study Assistant for Notes, PDFs & Quizzes" },
      {
        name: "description",
        content:
          "Upload your notes or PDFs and let AI summarize chapters, answer questions, generate quizzes, and explain hard topics simply.",
      },
      { property: "og:title", content: "Lumen — AI Study Assistant" },
      {
        property: "og:description",
        content: "Chat with your notes. Summarize chapters. Generate quizzes. Learn faster.",
      },
    ],
  }),
  component: StudyAssistant,
});

type Mode = "chat" | "summarize" | "quiz" | "explain";

interface SourceDoc {
  id: string;
  name: string;
  text: string;
  chars: number;
}

const MODE_META: Record<
  Mode,
  { title: string; placeholder: string; cta: string; icon: typeof MessageSquare }
> = {
  chat: {
    title: "Ask anything about your notes",
    placeholder: "e.g. Explain the difference between mitosis and meiosis from my biology notes…",
    cta: "Ask Lumen",
    icon: MessageSquare,
  },
  summarize: {
    title: "Summarize a chapter",
    placeholder: "Optional: focus on a specific section, e.g. 'Just chapter 3' or leave blank.",
    cta: "Summarize",
    icon: BookOpen,
  },
  quiz: {
    title: "Generate a quiz",
    placeholder: "Optional: 'focus on definitions' or 'make it harder'.",
    cta: "Build my quiz",
    icon: Brain,
  },
  explain: {
    title: "Explain like I'm 15",
    placeholder: "Topic to explain, e.g. 'photosynthesis' (or leave blank for the whole document).",
    cta: "Explain it simply",
    icon: Lightbulb,
  },
};

function StudyAssistant() {
  const ask = useServerFn(askStudyAI);
  const [mode, setMode] = useState<Mode>("chat");
  const [docs, setDocs] = useState<SourceDoc[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const totalChars = useMemo(
    () => docs.reduce((n, d) => n + d.chars, 0) + pastedText.length,
    [docs, pastedText],
  );

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setParsing(true);
    try {
      const added: SourceDoc[] = [];
      for (const file of Array.from(files)) {
        try {
          let text = "";
          if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            text = await extractPdfText(file);
          } else if (
            file.type.startsWith("text/") ||
            /\.(txt|md|markdown)$/i.test(file.name)
          ) {
            text = await file.text();
          } else {
            toast.error(`${file.name}: only PDF and text files are supported.`);
            continue;
          }
          if (!text.trim()) {
            toast.error(`${file.name}: no readable text found.`);
            continue;
          }
          added.push({
            id: crypto.randomUUID(),
            name: file.name,
            text,
            chars: text.length,
          });
        } catch (e) {
          console.error(e);
          toast.error(`Couldn't read ${file.name}.`);
        }
      }
      if (added.length) {
        setDocs((prev) => [...prev, ...added]);
        toast.success(`Added ${added.length} document${added.length > 1 ? "s" : ""}.`);
      }
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, []);

  const removeDoc = (id: string) => setDocs((prev) => prev.filter((d) => d.id !== id));

  const submit = async () => {
    const material = [
      ...docs.map((d) => `# ${d.name}\n${d.text}`),
      pastedText.trim() ? `# Pasted notes\n${pastedText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!material && !question.trim()) {
      toast.error("Upload notes, paste text, or type a question first.");
      return;
    }
    setLoading(true);
    setAnswer("");
    try {
      const res = await ask({ data: { mode, material, question } });
      if (!res.ok) {
        toast.error(res.error);
      } else {
        setAnswer(res.content);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const ActiveIcon = MODE_META[mode].icon;

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />

      {/* Hero */}
      <header className="relative overflow-hidden bg-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,white,transparent_35%)]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pb-20 sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Your private AI study buddy
          </div>
          <h1 className="mt-5 font-display text-4xl leading-[1.05] sm:text-6xl">
            Turn your notes into{" "}
            <span className="italic text-[oklch(0.85_0.13_85)]">understanding.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-primary-foreground/80 sm:text-lg">
            Drop in a PDF or paste your notes. Lumen summarizes chapters, answers your questions,
            builds quizzes, and explains the hard parts in plain language.
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* Left: Sources */}
          <section className="space-y-4">
            <h2 className="font-display text-2xl">1. Your study material</h2>

            <label
              htmlFor="file-input"
              className="block cursor-pointer rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center transition hover:border-accent hover:bg-surface"
            >
              <Upload className="mx-auto h-7 w-7 text-accent" />
              <div className="mt-3 font-medium text-foreground">
                Upload PDFs or text files
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Up to 80 pages per PDF · processed in your browser
              </div>
              <input
                ref={inputRef}
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.txt,.md,text/plain,application/pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={parsing}
              />
              {parsing && (
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Reading documents…
                </div>
              )}
            </label>

            {docs.length > 0 && (
              <ul className="space-y-2">
                {docs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(d.chars / 1000).toLocaleString()}k characters
                      </div>
                    </div>
                    <button
                      onClick={() => removeDoc(d.id)}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      aria-label={`Remove ${d.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                …or paste your notes
              </label>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste lecture notes, a textbook excerpt, anything…"
                className="min-h-32 resize-y bg-card"
              />
            </div>

            {totalChars > 0 && (
              <div className="text-xs text-muted-foreground">
                {Math.round(totalChars / 1000).toLocaleString()}k characters loaded
              </div>
            )}
          </section>

          {/* Right: Mode + Ask */}
          <section className="space-y-4">
            <h2 className="font-display text-2xl">2. What do you need?</h2>

            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-secondary p-1 sm:grid-cols-4">
                <TabsTrigger value="chat" className="gap-1.5 py-2 text-xs sm:text-sm">
                  <MessageSquare className="h-3.5 w-3.5" /> Chat
                </TabsTrigger>
                <TabsTrigger value="summarize" className="gap-1.5 py-2 text-xs sm:text-sm">
                  <BookOpen className="h-3.5 w-3.5" /> Summarize
                </TabsTrigger>
                <TabsTrigger value="quiz" className="gap-1.5 py-2 text-xs sm:text-sm">
                  <Brain className="h-3.5 w-3.5" /> Quiz
                </TabsTrigger>
                <TabsTrigger value="explain" className="gap-1.5 py-2 text-xs sm:text-sm">
                  <Lightbulb className="h-3.5 w-3.5" /> Explain
                </TabsTrigger>
              </TabsList>

              {(["chat", "summarize", "quiz", "explain"] as Mode[]).map((m) => (
                <TabsContent key={m} value={m} className="mt-4">
                  <div className="rounded-2xl border border-border bg-card-grad p-5 shadow-elegant">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                      <ActiveIcon className="h-4 w-4 text-accent" />
                      {MODE_META[m].title}
                    </div>
                    <Textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder={MODE_META[m].placeholder}
                      className="min-h-24 resize-y bg-background"
                    />
                    <Button
                      onClick={submit}
                      disabled={loading || parsing}
                      size="lg"
                      className="mt-4 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" /> {MODE_META[m].cta}
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div ref={resultRef}>
              {answer && (
                <article className="mt-2 rounded-2xl border border-border bg-card p-6 shadow-elegant">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    <Sparkles className="h-3 w-3 text-accent" /> Lumen
                  </div>
                  <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h2:mt-6 prose-h2:text-xl prose-p:leading-relaxed prose-strong:text-foreground prose-li:my-1">
                    <ReactMarkdown>{answer}</ReactMarkdown>
                  </div>
                </article>
              )}

              {!answer && !loading && (
                <div className="mt-2 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
                  Your AI-generated answer will appear here.
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="mt-16 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Lumen · AI study assistant · Files are processed in your browser and never stored.
        </footer>
      </main>
    </div>
  );
}
