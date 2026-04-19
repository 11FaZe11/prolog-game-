/**
 * prolog-engine.ts — a small, browser-native Prolog-style query engine over
 * the alchemy recipe database.
 *
 * Why not tau-prolog? Two reasons:
 *   1. The npm package has Node-only `require("fs")` / `child_process`
 *      branches that Next/Turbopack can't resolve for the browser.
 *   2. The prebuilt browser bundles on CDN aren't reachable from the
 *      development sandbox, so every query would fail.
 *
 * So we implement just enough Prolog to back the terminal:
 *   - Terms: atoms, variables, compound terms
 *   - Unification with occurs-check-free substitution
 *   - Depth-first resolution with proper backtracking
 *   - Conjunction of goals in a single query (`g1, g2, g3.`)
 *   - Comments with % ...
 *
 * The knowledge base is pure facts, derived at query time from the recipe
 * list so it always reflects the latest `discovered` set:
 *
 *   combine/3        — symmetric (a,b) -> r. Both directions are asserted.
 *   recipe/3         — alias of combine/3 for familiarity.
 *   element/1        — X is the name of a known element.
 *   tier/2           — element tier 0..12
 *   category/2       — element category
 *   discovered/1     — element has been discovered by the player
 *   reachable/1      — same as discovered (nicer name for queries)
 *
 * Example queries:
 *   combine(water, fire, X).
 *   combine(X, Y, steam).
 *   element(X), tier(X, 2).
 *   category(X, life), discovered(X).
 *   recipe(A, B, dragon).
 */

import {
  allElementNames,
  allRecipes,
  CATEGORIES,
  ELEMENTS,
  type ElementCategory,
} from "./recipes"

/* ═════════════════════════════════════════════════════════════════════════
 * Term model
 * ═════════════════════════════════════════════════════════════════════════
 */

export type Term =
  | { kind: "atom"; name: string }
  | { kind: "var"; name: string }
  | { kind: "compound"; functor: string; args: Term[] }

const atom = (name: string): Term => ({ kind: "atom", name })
const variable = (name: string): Term => ({ kind: "var", name })
const compound = (functor: string, args: Term[]): Term => ({
  kind: "compound",
  functor,
  args,
})

/** Pretty-print a term for display in the REPL. */
export function formatTerm(t: Term, sub: Substitution = new Map()): string {
  t = walk(t, sub)
  if (t.kind === "atom") return t.name
  if (t.kind === "var") return `_${t.name}`
  return `${t.functor}(${t.args.map((a) => formatTerm(a, sub)).join(", ")})`
}

/* ═════════════════════════════════════════════════════════════════════════
 * Tokenizer
 * ═════════════════════════════════════════════════════════════════════════
 */

type Token =
  | { kind: "atom"; value: string }
  | { kind: "var"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" }
  | { kind: "dot" }

export class PrologParseError extends Error {}

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    // whitespace
    if (/\s/.test(c)) {
      i++
      continue
    }
    // comment to end of line
    if (c === "%") {
      while (i < src.length && src[i] !== "\n") i++
      continue
    }
    if (c === "(") {
      tokens.push({ kind: "lparen" })
      i++
      continue
    }
    if (c === ")") {
      tokens.push({ kind: "rparen" })
      i++
      continue
    }
    if (c === ",") {
      tokens.push({ kind: "comma" })
      i++
      continue
    }
    if (c === ".") {
      tokens.push({ kind: "dot" })
      i++
      continue
    }
    // Variable: starts with uppercase or underscore
    if (/[A-Z_]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++
      tokens.push({ kind: "var", value: src.slice(i, j) })
      i = j
      continue
    }
    // Atom: starts with lowercase
    if (/[a-z]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++
      tokens.push({ kind: "atom", value: src.slice(i, j) })
      i = j
      continue
    }
    // Bare integer — we treat these as atoms so `tier(X, 3).` works. The
    // engine doesn't implement arithmetic, just literal-atom equality.
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < src.length && /[0-9]/.test(src[j])) j++
      tokens.push({ kind: "atom", value: src.slice(i, j) })
      i = j
      continue
    }
    // Single-quoted atom: 'hello world'
    if (c === "'") {
      let j = i + 1
      while (j < src.length && src[j] !== "'") j++
      if (j >= src.length) {
        throw new PrologParseError("unterminated quoted atom")
      }
      tokens.push({ kind: "atom", value: src.slice(i + 1, j) })
      i = j + 1
      continue
    }
    throw new PrologParseError(`unexpected character '${c}'`)
  }
  return tokens
}

/* ═════════════════════════════════════════════════════════════════════════
 * Parser
 *
 * A query is a conjunction of goals terminated by a dot:
 *     g1 , g2 , ... , gn .
 *
 * Each goal is a term: an atom (zero-arity), a variable (technically illegal
 * as a standalone goal but we reject it below), or a compound term.
 * ═════════════════════════════════════════════════════════════════════════
 */

export type Query = {
  goals: Term[]
  /** Names of variables the user introduced, in the order they appeared. */
  userVars: string[]
}

export function parseQuery(src: string): Query {
  const tokens = tokenize(src.trim())
  if (tokens.length === 0) {
    throw new PrologParseError("empty query")
  }
  let pos = 0

  const peek = () => tokens[pos]
  const eat = (kind: Token["kind"]) => {
    const t = tokens[pos]
    if (!t || t.kind !== kind) {
      throw new PrologParseError(
        `expected ${kind}, got ${t ? t.kind : "end of input"}`,
      )
    }
    pos++
    return t
  }

  const userVarsSet = new Set<string>()
  const userVars: string[] = []
  const recordVar = (name: string) => {
    // Anonymous variable — ignore for display.
    if (name === "_") return
    if (userVarsSet.has(name)) return
    userVarsSet.add(name)
    userVars.push(name)
  }

  const parseTerm = (): Term => {
    const t = peek()
    if (!t) throw new PrologParseError("unexpected end of input")
    if (t.kind === "var") {
      pos++
      // Anonymous vars get a fresh unique name so they never unify with
      // each other.
      const name = t.value === "_" ? `_anon_${anonCounter++}` : t.value
      recordVar(t.value)
      return variable(name)
    }
    if (t.kind === "atom") {
      pos++
      // Compound term?
      if (peek()?.kind === "lparen") {
        eat("lparen")
        const args: Term[] = [parseTerm()]
        while (peek()?.kind === "comma") {
          eat("comma")
          args.push(parseTerm())
        }
        eat("rparen")
        return compound(t.value, args)
      }
      return atom(t.value)
    }
    throw new PrologParseError(`unexpected token '${t.kind}'`)
  }

  const goals: Term[] = [parseTerm()]
  while (peek()?.kind === "comma") {
    eat("comma")
    goals.push(parseTerm())
  }
  eat("dot")
  if (pos !== tokens.length) {
    throw new PrologParseError("trailing tokens after dot")
  }

  // Validate that no standalone variable was used as a goal.
  for (const g of goals) {
    if (g.kind === "var") {
      throw new PrologParseError("cannot use a variable on its own as a goal")
    }
  }

  return { goals, userVars }
}

/* ═════════════════════════════════════════════════════════════════════════
 * Unification
 *
 * Substitutions map variable names -> Terms. `walk` follows the chain
 * until it hits an unbound variable or a non-variable term.
 * ═════════════════════════════════════════════════════════════════════════
 */

export type Substitution = Map<string, Term>

function walk(t: Term, sub: Substitution): Term {
  while (t.kind === "var") {
    const next = sub.get(t.name)
    if (!next) return t
    t = next
  }
  return t
}

function unify(a: Term, b: Term, sub: Substitution): Substitution | null {
  a = walk(a, sub)
  b = walk(b, sub)
  if (a.kind === "var") {
    if (b.kind === "var" && b.name === a.name) return sub
    // Extend sub (copy-on-write to stay functional-ish).
    const next = new Map(sub)
    next.set(a.name, b)
    return next
  }
  if (b.kind === "var") {
    const next = new Map(sub)
    next.set(b.name, a)
    return next
  }
  if (a.kind === "atom" && b.kind === "atom") {
    return a.name === b.name ? sub : null
  }
  if (a.kind === "compound" && b.kind === "compound") {
    if (a.functor !== b.functor || a.args.length !== b.args.length) return null
    let cur: Substitution | null = sub
    for (let i = 0; i < a.args.length; i++) {
      cur = unify(a.args[i], b.args[i], cur!)
      if (!cur) return null
    }
    return cur
  }
  return null
}

/* ═════════════════════════════════════════════════════════════════════════
 * Knowledge base
 *
 * For our KB every clause is a fact (no rule bodies), so a clause is simply
 * a Term. We build the facts lazily per query so `discovered/1` reflects
 * the player's current progress.
 * ═════════════════════════════════════════════════════════════════════════
 */

export type KB = Map<string, Term[]> // key = "functor/arity"

const keyFor = (functor: string, arity: number) => `${functor}/${arity}`

let anonCounter = 0

/**
 * Build a fresh KB for the current game state.
 *
 * `discovered` is the set of element names the player has unlocked. Keeping
 * the KB fresh per query means the game and terminal never drift out of
 * sync — every assertion you see is true *right now*.
 */
export function buildKB(discovered: Set<string>): KB {
  const kb: KB = new Map()
  const push = (functor: string, args: Term[]) => {
    const k = keyFor(functor, args.length)
    const list = kb.get(k) ?? []
    list.push(compound(functor, args))
    kb.set(k, list)
  }

  // combine/3 and recipe/3 (symmetric)
  for (const { a, b, result } of allRecipes()) {
    push("combine", [atom(a), atom(b), atom(result)])
    push("recipe", [atom(a), atom(b), atom(result)])
    if (a !== b) {
      push("combine", [atom(b), atom(a), atom(result)])
      push("recipe", [atom(b), atom(a), atom(result)])
    }
  }

  // element/1, tier/2, category/2
  for (const name of allElementNames()) {
    const meta = ELEMENTS[name]
    push("element", [atom(name)])
    push("tier", [atom(name), atom(String(meta.tier))])
    push("category", [atom(name), atom(meta.category)])
  }

  // Also register the category names themselves as atoms so
  // `category(X, life).` works the way users expect.
  for (const c of CATEGORIES) {
    // no-op: category atoms are already referenced above, but we expose
    // a predicate to *list* all categories for convenience.
    push("is_category", [atom(c)])
  }

  // discovered/1 and reachable/1 (same relation, two names)
  for (const name of discovered) {
    push("discovered", [atom(name)])
    push("reachable", [atom(name)])
  }

  return kb
}

/* ═════════════════════════════════════════════════════════════════════════
 * Resolver
 *
 * Depth-first search over the KB. `solve` is a generator that yields every
 * substitution under which all goals hold simultaneously.
 *
 * Every time we try a clause we have to rename its variables to fresh
 * names so a second usage of the same clause doesn't collide with the
 * first — standard Prolog freshening.
 * ═════════════════════════════════════════════════════════════════════════
 */

let freshCounter = 0

function freshen(t: Term, renames = new Map<string, string>()): Term {
  if (t.kind === "atom") return t
  if (t.kind === "var") {
    let name = renames.get(t.name)
    if (!name) {
      name = `${t.name}@${++freshCounter}`
      renames.set(t.name, name)
    }
    return variable(name)
  }
  return compound(
    t.functor,
    t.args.map((a) => freshen(a, renames)),
  )
}

function arityOf(t: Term): number {
  return t.kind === "compound" ? t.args.length : 0
}
function functorOf(t: Term): string {
  return t.kind === "compound" ? t.functor : t.name
}

export function* solve(
  goals: Term[],
  sub: Substitution,
  kb: KB,
): Generator<Substitution> {
  if (goals.length === 0) {
    yield sub
    return
  }
  const [goal, ...rest] = goals
  const resolved = walk(goal, sub)
  if (resolved.kind === "var") {
    // Can't resolve a goal that is still just a variable.
    return
  }
  const key = keyFor(functorOf(resolved), arityOf(resolved))
  const clauses = kb.get(key) ?? []
  for (const clause of clauses) {
    const fresh = freshen(clause)
    const next = unify(resolved, fresh, sub)
    if (!next) continue
    yield* solve(rest, next, kb)
  }
}

/* ═════════════════════════════════════════════════════════════════════════
 * Public entrypoint
 * ═════════════════════════════════════════════════════════════════════════
 */

export type Binding = { name: string; value: string }
export type Solution = { bindings: Binding[] }

/**
 * Run a parsed Query against the KB and return up to `limit` solutions.
 *
 * Each solution is a list of user-visible variable bindings, where every
 * Term has been walked and pretty-printed. Unbound variables are kept so
 * the REPL can still display them as `_`.
 */
export function runQuery(
  query: Query,
  kb: KB,
  limit = 50,
): { solutions: Solution[]; truncated: boolean } {
  const solutions: Solution[] = []
  let count = 0
  let truncated = false
  for (const sub of solve(query.goals, new Map(), kb)) {
    const bindings: Binding[] = query.userVars.map((name) => ({
      name,
      value: formatTerm(variable(name), sub),
    }))
    solutions.push({ bindings })
    count++
    if (count >= limit) {
      // Check if there would be more — cheap peek by consuming one extra.
      // We can't actually know without another iteration, so we simply mark
      // the result as possibly-truncated.
      truncated = true
      break
    }
  }
  return { solutions, truncated }
}

/* ═════════════════════════════════════════════════════════════════════════
 * Builtin metadata — used by the REPL for help + autocomplete.
 * ═════════════════════════════════════════════════════════════════════════
 */

export const BUILTIN_PREDICATES: {
  name: string
  arity: number
  summary: string
  example: string
}[] = [
  {
    name: "combine",
    arity: 3,
    summary: "combine(A, B, R) — A + B yields R (symmetric).",
    example: "combine(water, fire, X).",
  },
  {
    name: "recipe",
    arity: 3,
    summary: "recipe(A, B, R) — alias for combine/3.",
    example: "recipe(A, B, dragon).",
  },
  {
    name: "element",
    arity: 1,
    summary: "element(X) — X is the name of a known element.",
    example: "element(X).",
  },
  {
    name: "tier",
    arity: 2,
    summary: "tier(X, N) — element X sits at progression tier N (0..12).",
    example: "tier(X, 3).",
  },
  {
    name: "category",
    arity: 2,
    summary:
      "category(X, C) — X's category (water / fire / earth / air / plant / life / material / cold / special).",
    example: "category(X, life).",
  },
  {
    name: "discovered",
    arity: 1,
    summary: "discovered(X) — X has been unlocked in the current playthrough.",
    example: "discovered(X).",
  },
  {
    name: "reachable",
    arity: 1,
    summary: "reachable(X) — alias for discovered/1.",
    example: "reachable(X).",
  },
]
