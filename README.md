# Triumph of Science / Bitcoin / Christian Religion

## Dev

## Modify JS

1. Pretty much all visuals would be changing in the `fragmentShader` in `main.js`.


### Test inscribe

1. Get `ord env` running

```bash
    # Optional: clear previous contents of env dir
    rm -rf env
    just env
```

2. Inscribe javascript module

```bash
    # Optional: clear previous contents of env dir
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
