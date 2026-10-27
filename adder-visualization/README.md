**Live site:** https://tejas-ml.github.io/adder-visualization/

# Binary Adder

Interactive 4-bit ripple-carry adder. Choose two numbers (0–15) and watch a chain of full adders compute the sum — gates, wires, and carry included.

## Features

- Toggle bits or step the decimal values of A and B
- Example pairs, including overflow (`15 + 1`) and a random pair
- Live 4-bit ripple-carry chain (LSB on the right)
- Click a full adder to inspect XOR, AND, and OR gates
- Carry-ripple animation
- Column addition with place values and carries
- Live Boolean equations for the selected bit

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://127.0.0.1:8765, or open `index.html` in a browser.

## How it adds

Each bit uses a full adder:

- **Sum:** \(S = A \oplus B \oplus C_{in}\)
- **Carry:** \(C_{out} = (A \land B) \lor (C_{in} \land (A \oplus B))\)

\(C_{out}\) of bit \(i\) is \(C_{in}\) of bit \(i+1\). \(C_0 = 0\).
