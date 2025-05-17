# Triumph of Science / Bitcoin / Christian Religion

## Dev

## Fast-reload edits on `main.js`

1. Pretty much all visuals would be changing in the `fragmentShader` in `main.js`.
2. Run the following command to start a local server with hot reloading:

```bash
    j dev
```

3. Open `http://localhost:5173/` in your browser if it doesn't open automatically.

4. Edit `main.js` and save. The page should reload automatically but it might not update if you make small changes or save multiple times in quick succession. If that happens, just refresh the page manually.


### Test inscribe

1. Get `ord env` running

```bash
    # Optional: clear previous contents of env dir
    rm -rf env
    just env
```

2. Inscribe javascript module, but first edit the two imports at the top to remove ".js" and ".jpg" respectively

```javascript
    import { decode } from '/content/077fbf9e2d8c405e5f276220ed83c029eb86ecc1bd22a60a63a43eb925f28636i0.js';
const texture = '/content/23a6b16fc26b570b1669a9a1efdbab935fe524f2bbcc32504acfc65a1b0fb31bi0.jpg';

```

```bash
    j batch js.yaml
```

3. Change `<sript src=.../>` in `inscribed.html`.

```html
    <script type="module" src="/content/..."></script>
```

4. Inscribe HTML file

```bash
    j batch html.yaml
```

5. Wallet receive + copy address

```bash
    j wallet receive
```

6. Mine

```bash
    j mine {address from previous step}
```

7. View at `http://localhost:9001/`. If you cleared the env dir initially then the html is `/1`
