import random
import json
import os
import copy


TOB_LIST = [
    "fbab7ffde03428ed7c11dc268605241b6e33ea212229b03fb1d8f21e289fae54i0",
    "63594e1b8512a5ad3215acfb7470f181444c773c0953d875f9713fca3d896774i0",
    "5f53dd709a8d2e350674d86679ff550763502a0ff8c2b567cefa4b52f736aa7fi0",
    "a4fca8cd68283460126b88cce9a4d7462917eae4e6c1a5f91300fb9280eae7dbi0",
    "cf3ae616cfa57b2304a43445a0025e16d1c36943ed15cb1af5898185cf0d88efi0",
    "11e0ab1f653675211944593bb87d1b875050c2f328ab175595d2e7189da9b2f8i0",
    "ec11a3e19cb22adf6a880c63b1daf19568cf5a6717572bfd123d91f15fe4d241i0",
    "ba4b86348a6e7bad9deeb21752cf790694355b639650c679ce5b1c61feeab004i0",
    "fb9fad20ede2f27b013efe9b408e6be1b3ff546dfca53eac86c7e0f1a632d551i0",
    "ff08f64a29c957c1f376ca1d35c2ccb5851379da3df9618b8108f55ed65dfb39i0",
    "7fcc33c4cb0081cfa85c5d1d541aad5d8c631debbb29c65c95f4d30137ed2aa0i0",]
TOS_LIST = [
    "6461c2a49eba6c8220bf472d9a504554a0592470f0cdddddb0969e896a1a6ca9i0",
    "b1ff3531357fc4703e14454c8cfc606c79f88f87f908ec0d34a3e7eb02a843adi0",
    "806d80e7cf7f39208eccf59102e0086d6b593dbe3152777ef31dfc869a02340fi0",]


# Combine all source inscription IDs
SOURCE_IDS = TOB_LIST + TOS_LIST
TOTAL_VARIATIONS = 333


#------------------------------------------>>
#
#         Base Variation
#
#------------------------------------------>>

# Base metadata (your starting values)
BASE_METADATA = {
  "radius": 0.015,
  "cOffset": [0.0, 0.0],
  "mOffset": [0.00, 0.0],
  "yOffset": [0.0, 0.0],
  "kOffset": [100, 100],
  "noiseAmp": 0.0,
  "colorMode": 0
}

# Allowed ± variance around each base value
PARAMETER_VARIANCES = {
  "radius": 0.005,
  "cOffset": [0.0222, 0.00222],
  "mOffset": [0.0333, 0.0333],
  "yOffset": [0.0111, 0.0111],
  "kOffset": [100, 100],
  "noiseAmp": 0.00001,
  "colorMode": 0
}

# Clustering factor for normal parameters (higher = tighter clustering)
NORMAL_CLUSTERING_FACTOR = 8.88

#------------------------------------------>>
#
#         Outlier Variation
#
#------------------------------------------>>

# Outlier base values - used when deciding to create an outlier
OUTLIER_BASE_METADATA = {
  "radius": 0.0666,                # Much larger radius than normal
  "cOffset": [0.0333, -0.0333],     # Significant offset for cyan
  "mOffset": [0.0333, -0.0333],       # Significant offset for magenta
  "yOffset": [0.0111, -0.0111],     # Significant offset for yellow
  "kOffset": [100, 100],         
  "noiseAmp": 0.0111,               # Much more noise
  "colorMode": 0
}

OUTLIER_VARIANCE_MULTIPLIERS = {
    "cOffset": 5.0,  # 5x wider range for cyan offset outliers
    "mOffset": 5.0,  # 5x wider range for magenta offset outliers  
    "yOffset": 5.0,  # 5x wider range for yellow offset outliers
    "kOffset": 1.0,  # No change for kOffset
    "noiseAmp": 4.20 # 4.2x wider range for noise amplitude outliers
}

# Probability (0.0-1.0) of using the outlier value for each parameter
OUTLIER_PROBABILITIES = {
  "radius": 0.0111,      
  "cOffset": 0.0222,     
  "mOffset": 0.0222,     
  "yOffset": 0.0111,     
  "kOffset": 0.0,      
  "noiseAmp": 0.0111,
  "colorMode": 0.0333  
}

OUTLIER_CASCADE_FACTOR = 4.20 # increases chances of subsequent outliers

# Clustering factor for outliers (lower = more spread out)
OUTLIER_CLUSTERING_FACTOR = 3.33  # Much more variance for outliers


def be_random(base, delta, is_outlier=False):
    """Return a normally-distributed random value centered on base,
       clamped to [base-delta, base+delta], with adjustable clustering."""
    # Choose clustering factor based on whether this is an outlier
    clustering_factor = OUTLIER_CLUSTERING_FACTOR if is_outlier else NORMAL_CLUSTERING_FACTOR
    
    # Calculate sigma based on clustering factor
    sigma = delta / clustering_factor
    val = random.gauss(base, sigma)
    # clamp to the allowed interval
    return max(base - delta, min(base + delta, val))


def generate_variation(base_metadata, variances, source_id, variation_id):
    variation = copy.deepcopy(base_metadata)
    outliers_used = []
    outlier_bonus = 1.0  # Starts at 1.0 (normal probability)

    # Create lists of all parameters by type
    scalar_params = ["radius", "noiseAmp"]
    vector_params = ["cOffset", "mOffset", "yOffset", "kOffset"]
    
    # Combine and shuffle all parameters (except colorMode which is handled separately)
    all_params = scalar_params + vector_params
    random.shuffle(all_params)
    
    # Handle colorMode first (or you could include it in the randomization if preferred)
    base_probability = OUTLIER_PROBABILITIES["colorMode"]
    is_out = random.random() < (base_probability * outlier_bonus)
    if is_out:
        variation["colorMode"] = random.randint(1, 6)
        outliers_used.append("colorMode")
        outlier_bonus = OUTLIER_CASCADE_FACTOR
    else:
        variation["colorMode"] = 0
    
    # Process all other parameters in random order
    for param in all_params:
        base_probability = OUTLIER_PROBABILITIES[param]
        is_out = random.random() < (base_probability * outlier_bonus)
        
        if is_out:
            outliers_used.append(param)
            outlier_bonus = OUTLIER_CASCADE_FACTOR
            
            # Handle parameter based on its type
            if param in scalar_params:
                if param in OUTLIER_VARIANCE_MULTIPLIERS:
                    base = base_metadata[param]
                    delta = variances[param] * OUTLIER_VARIANCE_MULTIPLIERS[param]
                else:
                    base = OUTLIER_BASE_METADATA[param]
                    delta = variances[param]
                variation[param] = abs(be_random(base, delta, is_out))
            else:  # vector param
                bx, by = base_metadata[param]
                vx, vy = variances[param]
                multiplier = OUTLIER_VARIANCE_MULTIPLIERS[param]
                effective_vx = vx * (multiplier if is_out else 1.0)
                effective_vy = vy * (multiplier if is_out else 1.0)
                variation[param] = [
                    be_random(bx, effective_vx, is_out),
                    be_random(by, effective_vy, is_out)
                ]
        else:
            # Non-outlier case
            if param in scalar_params:
                base = base_metadata[param]
                delta = variances[param]
                variation[param] = abs(be_random(base, delta, is_out))
            else:  # vector param
                bx, by = base_metadata[param]
                vx, vy = variances[param]
                variation[param] = [
                    be_random(bx, vx, is_out),
                    be_random(by, vy, is_out)
                ]

    # record metadata
    variation["sourceId"] = source_id
    variation["variationId"] = variation_id
    variation["outliers"] = outliers_used
    variation["isOutlier"] = bool(outliers_used)
    
    if outliers_used:
        print(f"      Variation {variation_id} using outliers: {', '.join(outliers_used)}")
    return variation


def main():
    os.makedirs("variations", exist_ok=True)
    per_src = TOTAL_VARIATIONS // len(SOURCE_IDS)
    extra   = TOTAL_VARIATIONS % len(SOURCE_IDS)
    all_vars = []
    vid = 0

    print(f"Starting generation of {TOTAL_VARIATIONS} total variations across {len(SOURCE_IDS)} sources")

    for idx, src in enumerate(SOURCE_IDS):
        count = per_src + (1 if idx < extra else 0)
        print(f" • Source {idx+1}/{len(SOURCE_IDS)} ({src[:8]}…): generating {count} variations")

        for _ in range(count):
            v = generate_variation(BASE_METADATA, PARAMETER_VARIANCES, src, vid)
            path = f"variations/variation_{vid}.json"
            with open(path, "w") as f:
                json.dump(v, f, indent=2)
            print(f"    – Saved variation_{vid}.json")
            all_vars.append(v)
            vid += 1

    # write combined file
    all_path = "variations/all_variations.json"
    with open(all_path, "w") as f:
        json.dump(all_vars, f, indent=2)
    print(f"\nWrote combined file: {all_path}")

    # Variations per source
    sources_count = {}
    for var in all_vars:
        sources_count[var["sourceId"]] = sources_count.get(var["sourceId"], 0) + 1
    print("\nVariations per source:")
    for src, cnt in sources_count.items():
        print(f"   {src[:8]}... : {cnt}")

    # Outlier statistics by parameter
    outlier_counts = {p: 0 for p in OUTLIER_PROBABILITIES}
    for var in all_vars:
        for p in OUTLIER_PROBABILITIES:
            if var.get("isOutlier") and p in var.get("outliers", []):
                outlier_counts[p] += 1
    print("\nOutlier statistics:")
    for p, cnt in outlier_counts.items():
        pct = cnt / len(all_vars) * 100
        target = OUTLIER_PROBABILITIES[p] * 100
        print(f"   {p}: {cnt} ({pct:.1f}% vs target {target:.1f}%)")

    # Finally, list all variation IDs that had any outlier flag
    outlier_ids = [v["variationId"] for v in all_vars if v.get("isOutlier")]
    print(f"\nOutlier variation IDs ({len(outlier_ids)} total):")
    print(" ", outlier_ids)


if __name__=="__main__":
    main()