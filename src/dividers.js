const PATTERNS = [
    {
        start:
            ` 
\\
 `,
        middle:
            `     .--. 
::::::::.\\
\`--'      `,
        end:
            ` 
 
\``,
    },
    {
        start: '',
        middle: '¸,ø¤°`°¤ø,¸',
        end: '',
    }
]

window.addEventListener("load", updateDividers)
window.addEventListener("resize", updateDividers)

function getPattern(pattern, targetWidth) {
    // Split into columns
    const startLines = pattern.start.split('\n');
    const middleLines = pattern.middle.split('\n');
    const endLines = pattern.end.split('\n');

    // Find maximum number of columns
    const maxRows = Math.max(startLines.length, middleLines.length, endLines.length);

    // Length per section (based on first row, all are the same length now)
    const startLength = startLines[0]?.length || 0;
    const middleLength = middleLines[0]?.length || 0;
    const endLength = endLines[0]?.length || 0;

    // Calculate maximum number of whole repetitions that will fit
    const maximumLength = targetWidth - startLength - endLength;
    const repeatCount = middleLength > 0 ? Math.max(0, Math.floor(maximumLength / middleLength)) : 0;

    let output = [];

    for (let row = 0; row < maxRows; row++) {
        const startLine = startLines[row] || '';
        const contentLine = middleLines[row] || '';
        const endLine = endLines[row] || '';

        let line = startLine;

        // Add whole content block (same number for all rows)
        for (let i = 0; i < repeatCount; i++) {
            line += contentLine;
        }

        line += endLine;
        output.push(line);
    }

    return output.join('\n');
}

function updateDividers() {
    const dividers = document.querySelectorAll(".divider");

    dividers.forEach((divider) => {
        const pattern = divider.dataset.pattern;
        const maxDesiredLength = divider.dataset.maxLength;

        const padding = 10 //px per side
        const minWidth = 500;
        const dynamicPadding = Math.min(minWidth, window.innerWidth) / minWidth;
        const maxLength = (window.innerWidth / 10) - (padding * (dynamicPadding * 0.1));

        divider.innerText = getPattern(PATTERNS[pattern - 1], Math.min(maxLength, maxDesiredLength))
    });
}