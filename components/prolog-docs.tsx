"use client"

import { useState } from "react"
import {
  BookOpen,
  Brain,
  ChevronRight,
  Code2,
  Lightbulb,
  Search,
  Sparkles,
  Workflow,
} from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Documentation / explainer panel for the Prolog tab.
 *
 * This is a reading-focused view — there's no terminal state here, just
 * structured content organized into sections. It's wrapped in a two-pane
 * layout (nav on the left, article on the right) on wide screens and
 * collapses to a single scrollable column on mobile.
 */

type SectionId =
  | "what"
  | "expert"
  | "game"
  | "syntax"
  | "queries"
  | "backtracking"
  | "examples"

type Section = {
  id: SectionId
  label: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
}

const SECTIONS: Section[] = [
  { id: "what", label: "What is Prolog?", icon: BookOpen },
  { id: "expert", label: "Expert systems", icon: Brain },
  { id: "game", label: "This game as KB", icon: Sparkles },
  { id: "syntax", label: "Syntax primer", icon: Code2 },
  { id: "queries", label: "Writing queries", icon: Search },
  { id: "backtracking", label: "Backtracking", icon: Workflow },
  { id: "examples", label: "Examples", icon: Lightbulb },
]

export function PrologDocs() {
  const [active, setActive] = useState<SectionId>("what")

  return (
    <div className="flex h-full min-h-0 flex-col bg-background md:flex-row">
      {/* Section nav — horizontal scroller on mobile, vertical rail on desktop. */}
      <nav
        aria-label="Documentation sections"
        className={cn(
          "flex shrink-0 gap-1 border-b border-border bg-sidebar/40 p-2",
          "overflow-x-auto",
          "md:w-52 md:flex-col md:gap-0.5 md:overflow-y-auto md:overflow-x-hidden md:border-b-0 md:border-r",
        )}
      >
        {SECTIONS.map((s) => {
          const Icon = s.icon
          const isActive = active === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={cn(
                "group flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left transition-colors",
                "font-mono text-[11px] whitespace-nowrap",
                isActive
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground/70",
                )}
                aria-hidden
              />
              <span>{s.label}</span>
              <ChevronRight
                className={cn(
                  "ml-auto hidden h-3 w-3 shrink-0 transition-opacity md:block",
                  isActive ? "text-primary opacity-100" : "opacity-0",
                )}
                aria-hidden
              />
            </button>
          )
        })}
      </nav>

      <article className="terminal-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
          {active === "what" && <WhatIsProlog />}
          {active === "expert" && <ExpertSystems />}
          {active === "game" && <GameAsKB />}
          {active === "syntax" && <SyntaxPrimer />}
          {active === "queries" && <WritingQueries />}
          {active === "backtracking" && <Backtracking />}
          {active === "examples" && <Examples />}
        </div>
      </article>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
 * Shared typography primitives.
 *
 * Keeping these local to the docs panel so the terminal's font-mono
 * aesthetic doesn't leak into other parts of the codex, and so docs
 * prose can use a readable sans layout without fighting sibling styles.
 * ═════════════════════════════════════════════════════════════════════════
 */

function H1({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="alch-fade-in mb-1 font-sans text-2xl font-semibold tracking-tight text-balance text-foreground">
      {children}
    </h2>
  )
}

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="alch-fade-in mb-6 text-[15px] leading-relaxed text-pretty text-muted-foreground">
      {children}
    </p>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-8 mb-3 font-sans text-sm font-semibold uppercase tracking-[0.18em] text-primary">
      {children}
    </h3>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[14px] leading-relaxed text-pretty text-foreground/85">
      {children}
    </p>
  )
}

function K({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded border border-border bg-sidebar/60 px-1.5 py-0.5 font-mono text-[12px] text-accent">
      {children}
    </code>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre
      className={cn(
        "mb-4 overflow-x-auto rounded-lg border border-border bg-sidebar/60 p-3",
        "font-mono text-[12px] leading-relaxed",
      )}
    >
      <code>{children}</code>
    </pre>
  )
}

function Callout({
  children,
  tone = "primary",
  title,
}: {
  children: React.ReactNode
  tone?: "primary" | "accent"
  title?: string
}) {
  const border = tone === "accent" ? "border-accent/40" : "border-primary/40"
  const bg = tone === "accent" ? "bg-accent/5" : "bg-primary/5"
  return (
    <aside
      className={cn(
        "mb-4 rounded-lg border-l-2 px-4 py-3 text-[13px] leading-relaxed",
        border,
        bg,
      )}
    >
      {title && (
        <p className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      )}
      {children}
    </aside>
  )
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mb-4 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-foreground/85 marker:text-muted-foreground/60">
      {children}
    </ul>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
 * Sections
 * ═════════════════════════════════════════════════════════════════════════
 */

function WhatIsProlog() {
  return (
    <>
      <H1>What is Prolog?</H1>
      <Lead>
        Prolog is a declarative logic programming language. Instead of writing
        step-by-step instructions, you describe <em>facts</em> and{" "}
        <em>rules</em> about a world — and then ask <em>questions</em>. The
        language figures out the answers by itself.
      </Lead>

      <H2>Imperative vs. declarative</H2>
      <P>
        In JavaScript or Python you tell the computer <em>how</em> to compute
        something — loop over this list, increment that counter, return the
        result. In Prolog you tell the computer <em>what is true</em>, and it
        searches for ways to make your question true as well.
      </P>
      <Code>{`% A tiny fact base
parent(alice, bob).
parent(bob,   carol).

% A rule that builds on facts
ancestor(X, Z) :- parent(X, Z).
ancestor(X, Z) :- parent(X, Y), ancestor(Y, Z).

?- ancestor(alice, carol).
true.`}</Code>

      <H2>Where it came from</H2>
      <P>
        Prolog was born in 1972 at the University of Aix-Marseille. It quickly
        became the lingua franca of artificial intelligence in the 1970s and
        80s — especially for natural language processing, theorem proving, and{" "}
        <K>expert systems</K>.
      </P>

      <Callout tone="primary" title="core idea">
        A Prolog program is a <strong>knowledge base</strong>. A query is a
        question you pose to it. The engine answers by trying to prove your
        question true, exploring alternatives through backtracking.
      </Callout>
    </>
  )
}

function ExpertSystems() {
  return (
    <>
      <H1>Prolog in expert systems</H1>
      <Lead>
        An <em>expert system</em> is software that reproduces the decision
        making of a human specialist — a doctor diagnosing a symptom, a
        technician troubleshooting a fault, a chemist predicting a reaction.
        Prolog has been one of the go-to tools for building them for over 40
        years.
      </Lead>

      <H2>The anatomy of an expert system</H2>
      <UL>
        <li>
          <strong>Knowledge base</strong> — facts and rules elicited from a
          domain expert. In Prolog these are literally the program text.
        </li>
        <li>
          <strong>Inference engine</strong> — the reasoning machinery that
          chains rules together to answer questions. Prolog gives you this
          engine <em>for free</em> — it is the runtime.
        </li>
        <li>
          <strong>User interface</strong> — lets a non-expert pose queries in
          plain language. In our case, the alchemy canvas <em>is</em> the UI:
          dragging tokens issues queries.
        </li>
        <li>
          <strong>Explanation facility</strong> — shows <em>why</em> an answer
          was produced, by tracing the rules that fired.
        </li>
      </UL>

      <H2>Why Prolog fits so well</H2>
      <P>
        Domain knowledge is usually easiest to express as rules:{" "}
        <em>“if A and B are both true, then C follows.”</em> Prolog's clause
        syntax <K>C :- A, B.</K> maps one-to-one onto that natural form — no
        state machines, no if-else trees, no ORMs.
      </P>
      <P>
        The same rule can also be run <strong>backwards</strong>. Ask{" "}
        <K>diagnosis(X, fever).</K> and Prolog enumerates every condition whose
        rules could produce <em>fever</em> — the same code answers both
        forward questions ("given these symptoms, what is it?") and inverse
        ones ("for this diagnosis, what symptoms would we see?").
      </P>

      <Callout tone="accent" title="Famous examples">
        <UL>
          <li>
            <strong>MYCIN</strong> (1970s) — diagnosed bacterial infections.
            Rule-based, though MYCIN itself was in Lisp, many descendants used
            Prolog.
          </li>
          <li>
            <strong>XCON / R1</strong> — configured VAX computers at DEC.
            Saved tens of millions of dollars per year.
          </li>
          <li>
            <strong>IBM Watson</strong> — its core question-answering pipeline
            relied heavily on Prolog for matching facts.
          </li>
        </UL>
      </Callout>
    </>
  )
}

function GameAsKB() {
  return (
    <>
      <H1>This game is a tiny expert system</H1>
      <Lead>
        Every combination in the alchemy game is a <strong>fact</strong> in a
        Prolog-style knowledge base. Your discoveries become{" "}
        <K>discovered/1</K> facts. Each element is tagged with a{" "}
        <K>tier/2</K> and <K>category/2</K>. The terminal lets you query all
        of it in real time.
      </Lead>

      <H2>The schema</H2>
      <Code>{`% Every recipe appears twice (symmetric).
combine(water, fire, steam).
combine(fire, water, steam).

% Element metadata.
element(water).
tier(water, 0).
category(water, water).

% Your progress — asserted as you play.
discovered(water).
discovered(fire).
discovered(steam).`}</Code>

      <H2>Why this is more than a toy</H2>
      <P>
        The same shape — <em>facts + rules + a query front-end</em> — is how
        real expert systems work. Swap "element" for "disease", "combine" for
        "symptom-of", and you have the skeleton of a medical triage tool.
        Swap them for "part" and "incompatible-with", and you have a component
        configurator.
      </P>

      <Callout tone="primary" title="Watch it happen">
        Open the <K>prolog</K> tab while you play. Each new element you
        combine in the game appears live in the terminal as{" "}
        <K>assertz(discovered(...))</K>. The KB is rebuilt on every query so
        the world you see in the game and the world the terminal reasons
        about can never drift apart.
      </Callout>
    </>
  )
}

function SyntaxPrimer() {
  return (
    <>
      <H1>Syntax primer</H1>
      <Lead>
        Prolog is a small language. You can learn 90% of what matters in about
        five minutes.
      </Lead>

      <H2>Atoms, variables, compound terms</H2>
      <UL>
        <li>
          <strong>Atoms</strong> are constants — anything starting with a
          lowercase letter, like <K>water</K>, <K>dragon</K>, <K>life</K>.
        </li>
        <li>
          <strong>Variables</strong> start with an uppercase letter or
          underscore — <K>X</K>, <K>Result</K>, <K>_Ingredient</K>. A bare{" "}
          <K>_</K> is anonymous (each occurrence is a new variable).
        </li>
        <li>
          <strong>Compound terms</strong> have a functor and arguments:{" "}
          <K>combine(water, fire, X)</K>. The functor is <K>combine</K> and it
          has arity 3.
        </li>
      </UL>

      <H2>Facts and rules</H2>
      <Code>{`% A fact — always true.
combine(water, fire, steam).

% A rule — true when the body is provable.
symmetric(A, B, R) :- combine(A, B, R).
symmetric(A, B, R) :- combine(B, A, R).`}</Code>

      <H2>Queries</H2>
      <P>
        A query is a comma-separated list of goals terminated by a dot. Commas
        mean <em>and</em>. The engine tries every clause in order and prints
        the bindings of any variables you named.
      </P>
      <Code>{`?- combine(water, fire, X).
X = steam.

?- element(X), tier(X, 2).
X = steam ; X = mud ; X = lava ; ...`}</Code>
    </>
  )
}

function WritingQueries() {
  return (
    <>
      <H1>Writing queries against the game</H1>
      <Lead>
        The terminal exposes seven predicates. All of them are live — they
        always reflect the current state of the workbench.
      </Lead>

      <PredRow
        sig="combine(A, B, R)"
        desc="A + B yields R. Symmetric — the inverse combine(B, A, R) is also true."
        example="combine(water, fire, X)."
      />
      <PredRow
        sig="recipe(A, B, R)"
        desc="Alias for combine/3."
        example="recipe(A, B, dragon)."
      />
      <PredRow
        sig="element(X)"
        desc="X is a known element name (whether or not the player has discovered it)."
        example="element(X)."
      />
      <PredRow
        sig="tier(X, N)"
        desc="Element X sits at progression tier N (0 for the four primaries, up to 12)."
        example="tier(X, 3)."
      />
      <PredRow
        sig="category(X, C)"
        desc="X's category: water, fire, earth, air, plant, life, material, cold, or special."
        example="category(X, life)."
      />
      <PredRow
        sig="discovered(X)"
        desc="X has been unlocked in the current playthrough."
        example="discovered(X)."
      />
      <PredRow
        sig="reachable(X)"
        desc="Alias for discovered/1."
        example="reachable(X)."
      />

      <H2>Meta-commands</H2>
      <UL>
        <li>
          <K>help.</K> — list every predicate.
        </li>
        <li>
          <K>samples.</K> — show example queries.
        </li>
        <li>
          <K>listing.</K> — dump the whole knowledge base, one line per
          predicate.
        </li>
        <li>
          <K>clear.</K> — wipe the scrollback.
        </li>
      </UL>
    </>
  )
}

function PredRow({
  sig,
  desc,
  example,
}: {
  sig: string
  desc: string
  example: string
}) {
  return (
    <div className="mb-3 rounded-lg border border-border bg-sidebar/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-[12.5px] font-semibold text-primary">
          {sig}
        </code>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/80">
        {desc}
      </p>
      <p className="mt-2 font-mono text-[11.5px] text-muted-foreground">
        <span className="text-muted-foreground/60">?- </span>
        {example}
      </p>
    </div>
  )
}

function Backtracking() {
  return (
    <>
      <H1>Backtracking, explained</H1>
      <Lead>
        Backtracking is the single trick that makes Prolog go. When the engine
        can't prove a goal one way, it quietly rewinds and tries another.
      </Lead>

      <H2>A worked example</H2>
      <P>
        Imagine the KB contains three recipes for <K>steam</K>:
      </P>
      <Code>{`combine(water, fire, steam).
combine(water, lava, steam).
combine(ocean, sun,  steam).`}</Code>
      <P>
        When you ask{" "}
        <K>combine(X, Y, steam).</K> the engine picks the first clause, binds{" "}
        <K>X = water</K> and <K>Y = fire</K>, and reports that solution. Press{" "}
        <K>;</K> (or wait for the terminal to keep enumerating) and it{" "}
        <em>backtracks</em>: it undoes those bindings, moves to the next
        matching clause, and yields <K>X = water, Y = lava</K>. Then{" "}
        <K>X = ocean, Y = sun</K>. Then <K>false.</K> — no more matches.
      </P>

      <Callout tone="primary" title="Search, not iteration">
        Backtracking turns a single query into a <em>search</em> across every
        possible assignment of variables. That is what makes Prolog so good at
        configuration, planning, and diagnosis problems — the search is
        built-in.
      </Callout>

      <H2>Conjunction</H2>
      <P>
        When you chain goals with commas, the engine tries them left-to-right.
        If a later goal fails, it backtracks into the earlier ones to pick a
        different binding.
      </P>
      <Code>{`?- element(X), tier(X, 3), category(X, life).
% tries X = water — tier fails, backtrack
% tries X = fire  — tier fails, backtrack
% tries X = mud   — tier succeeds, category fails, backtrack
% eventually yields every tier-3 living thing.`}</Code>
    </>
  )
}

function Examples() {
  return (
    <>
      <H1>Example queries to try</H1>
      <Lead>
        Paste any of these into the terminal. They use only the predicates
        described in the previous sections.
      </Lead>

      <ExampleRow
        q="combine(water, fire, X)."
        d="Classic forward query: what do water and fire make?"
      />
      <ExampleRow
        q="combine(X, Y, dragon)."
        d="Inverse query: enumerate every pair of ingredients that produce a dragon."
      />
      <ExampleRow
        q="element(X), tier(X, 1)."
        d="All tier-1 elements — the first things you can make from the four primaries."
      />
      <ExampleRow
        q="category(X, life), discovered(X)."
        d="Every living thing you've unlocked so far."
      />
      <ExampleRow
        q="combine(A, B, R), tier(R, 5)."
        d="Every recipe whose output is a tier-5 element."
      />
      <ExampleRow
        q="recipe(water, X, R), discovered(X)."
        d="All things you can make right now using water plus something you already own."
      />
      <ExampleRow q="listing." d="Dump the entire knowledge base." />
      <ExampleRow q="help." d="Print the predicate reference." />
    </>
  )
}

function ExampleRow({ q, d }: { q: string; d: string }) {
  return (
    <div className="mb-3 rounded-lg border border-border bg-sidebar/40 p-4">
      <p className="font-mono text-[12.5px] text-foreground">
        <span className="text-primary">?- </span>
        {q}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        {d}
      </p>
    </div>
  )
}
