# CSS layout bugs that keep getting reported, and their causes

Class-level causes behind the usual "navbar is cut off", "text is truncated", "the row is
misaligned" reports in Tailwind/React UIs. Match the symptom, go straight to the class.

## 1. Header/nav overflows the viewport

All three flex zones (`brand`, `nav`, `actions`) carry `shrink-0` + `whitespace-nowrap`,
so nothing can give: the row's intrinsic width exceeds the container and the last button
is clipped at the viewport edge. Fixes, in order of preference:

- Shorten labels responsively: `<span className="hidden 2xl:inline">Full Label</span>` +
  `<span className="2xl:hidden">Short</span>`. Cheapest, keeps every control on one line.
- Make secondary buttons icon-only below a breakpoint (`hidden 2xl:inline` on the text).
- Trim `px-*`/`gap-*` one step down for md/sm.

Do not "fix" this with `flex-wrap` on a sticky header — it changes the header height and
pushes content on hover/scroll.

## 2. Text truncated with `...` while the panel still has room

Look for a hard `max-w-[NNNpx]` or a fixed `w-*` on the text node — that cap, not the
container, decides where the ellipsis lands. Pattern that behaves:

```jsx
<span className="min-w-0 flex-1 truncate">{longText}</span>   // takes the free space
<span className="shrink-0 tabular-nums">{short}</span>        // never compresses
```

Also low-contrast is not a mask: text that "looks faded" is usually `text-slate-400` at
10-11px that is *also* truncated. Raise one contrast step and re-check before hunting for
an overlay that does not exist.

## 3. Cards in a row have different heights, prices stop lining up

Grid children stretch, but the card's inner box does not unless told to. Give the outer
element `h-full` and the inner panel `flex flex-col` + `flex-1` on the info section. Then
every card in a row shares one height and bottom rows align across sibling columns.

## 4. Shelf/row dividers drift between two side-by-side lists

A literal plank under each row only lines up across columns if the rows have equal
heights — so uniform card height (see 3) is a prerequisite. Additionally, chunk items into
rows with a size that **matches the rendered column count**, otherwise a "row" of 3 wraps
into 2+1 and hangs off its own plank.

## 5. Conflicting display utilities on one element

`className="flex items-end grid grid-cols-3"` is a coin flip: `flex` and `grid` both set
`display`, and which wins depends on generated CSS order. Never mix them. Split into two
explicit branches — one string for the flex layout, one for the grid layout — chosen by the
mode variable.

## 6. Rotated text clipped mid-word

`writing-mode: vertical-rl` **plus** `rotate-90` rotates twice and throws the text out of
its box; `truncate`/`max-w` on vertical text cuts inside a word with no ellipsis. Use
`writing-mode` alone, drop `whitespace-nowrap`/`truncate`, keep `overflow-hidden` +
`title={text}` so the full value stays reachable.

## 7. A row of fixed-width items spills outside its frame

`n × width + (n-1) × gap` versus the inner width of the container — do the arithmetic
before blaming padding. Either narrow the items or reduce items-per-row; an
`overflow-x-auto` row that scrolls on desktop hides the problem instead of fixing it.

## 8. Layout collapses one breakpoint below the design width

A control bar that goes `flex-col` → `flex-row` at `lg` (1024px) routinely overflows at
exactly `lg`, because that is where the horizontal form is *just* too wide. Move the row
breakpoint up (`xl`), add `flex-wrap` to the right-hand cluster, then re-probe 1024 and 900.
