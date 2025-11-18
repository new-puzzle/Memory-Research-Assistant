# LaTeX Formatting Issue

## Problem
LaTeX equations in explanation results are not rendering correctly. Some matrices that should display as proper 2D matrices are showing as straight lines instead.

## Current Implementation
- LaTeX rendering is handled in `frontend/src/components/ResearchAssistant.tsx` in the `renderMathMarkdown()` function
- Uses `react-katex` library with `BlockMath` and `InlineMath` components
- Regex patterns match `$$...$$` (display math) and `$...$` (inline math)
- Content is extracted from JSON responses which may have escaped backslashes

## Issue Details
- Matrices like `\begin{pmatrix} a & b \\ c & d \end{pmatrix}` are not rendering as proper matrices
- Some equations render correctly, others show as straight lines
- The content comes from the backend as JSON with escaped backslashes (e.g., `\\begin{pmatrix}`)
- Current code attempts conditional unescaping but may not be handling all cases correctly

## Files to Check
- `frontend/src/components/ResearchAssistant.tsx` - `renderMathMarkdown()` function (lines ~136-222)
- `frontend/src/styles/index.css` - KaTeX styling (lines ~190-193)

## Testing
1. Get an explanation with matrices (e.g., "positive definite matrix")
2. Check if matrices render as 2D structures or straight lines
3. Check browser console for KaTeX errors
4. Verify content format when it comes from the store vs. directly from API

## Potential Solutions
- Verify how backslashes are handled when content is stored/retrieved from localStorage
- Check if KaTeX needs specific configuration for matrix rendering
- Consider using a different LaTeX rendering approach or library
- Debug the regex matching to ensure it's capturing LaTeX correctly

