# Coupes au tarot à 5 — calcul exact et simulation
# Script extrait de l'article ; requiert Julia (Random, Statistics, Printf).

# Usage : julia tarot-coupes.jl

using Random, Statistics, Printf

const MAXS = 14          # cartes par couleur
const MAXT = 22          # atouts + excuse

# Table des coefficients binomiaux C(n,k) pour n <= 22
const CB = zeros(Float64, MAXT+1, MAXT+1)
for n in 0:MAXT, k in 0:n
    CB[n+1, k+1] = binomial(n, k)
end

# Toutes les compositions d'une main de 15 cartes,
# avec n_c = 0 pour c dans `mask`, et n_c >= 1 sinon.
function hand_shapes(mask::Int)
    free = [s for s in 0:3 if (mask >> s) & 1 == 0]
    res = NTuple{5,Int}[]
    n = zeros(Int, 5)
    function rec(i, rem)
        if i > length(free)
            n[5] = rem
            (0 <= rem <= MAXT) && push!(res, Tuple(n))
            return
        end
        s = free[i]
        hi = min(MAXS, rem - (length(free) - i))
        for k in 1:hi
            n[s+1] = k
            rec(i+1, rem - k)
        end
        n[s+1] = 0
    end
    rec(1, 15)
    return res
end

# Nombre de facons de distribuer les quatre mains avec les masques donnes.
function count_config(deck::NTuple{5,Int}, masks::Vector{Int})
    dp = zeros(Float64, MAXS+1, MAXS+1, MAXS+1, MAXS+1, MAXT+1)
    dp[deck[1]+1, deck[2]+1, deck[3]+1, deck[4]+1, deck[5]+1] = 1.0
    for mask in masks
        sh = hand_shapes(mask)
        ndp = zeros(Float64, MAXS+1, MAXS+1, MAXS+1, MAXS+1, MAXT+1)
        for r0 in 0:MAXS, r1 in 0:MAXS, r2 in 0:MAXS, r3 in 0:MAXS, rt in 0:MAXT
            v = dp[r0+1, r1+1, r2+1, r3+1, rt+1]
            v == 0.0 && continue
            for (n0,n1,n2,n3,nt) in sh
                if n0 <= r0 && n1 <= r1 && n2 <= r2 && n3 <= r3 && nt <= rt
                    w = CB[r0+1,n0+1] * CB[r1+1,n1+1] * CB[r2+1,n2+1] *
                        CB[r3+1,n3+1] * CB[rt+1,nt+1]
                    ndp[r0-n0+1, r1-n1+1, r2-n2+1, r3-n3+1, rt-nt+1] += v * w
                end
            end
        end
        dp = ndp
    end
    return sum(dp)
end

# Probabilite d'une configuration precise (quatre masques donnes).
function prob_specific(deck::NTuple{5,Int}, masks::Vector{Int})
    N = sum(deck)
    total = Float64(binomial(N,15)) * Float64(binomial(N-15,15)) *
            Float64(binomial(N-30,15)) * Float64(binomial(N-45,15))
    return count_config(deck, masks) / total
end

# Probabilite de l'evenement E = structure 2-1-1-0.
function P_2110(deck::NTuple{5,Int})
    pairs = [(0,1),(0,2),(0,3),(1,2),(1,3),(2,3)]
    s = 0.0
    for (i,j) in pairs
        rem = [x for x in 0:3 if x != i && x != j]
        k, l = rem[1], rem[2]
        s += 24 * prob_specific(deck, [(1<<i)|(1<<j), 1<<k, 1<<l, 0])
    end
    return s
end

# Simulation de Monte Carlo.
function simulate_2110(nsim::Int; conditional::Bool=false)
    if conditional
        deck = vcat(zeros(Int,13), ones(Int,14), fill(2,14), fill(3,14), fill(4,22))
    else
        deck = vcat(zeros(Int,14), ones(Int,14), fill(2,14), fill(3,14), fill(4,22))
    end
    hits = 0
    cnt = zeros(Int,4)
    c = zeros(Int,5)
    @inbounds for _ in 1:nsim
        shuffle!(deck)
        fill!(c, 0)
        umask = 0
        for p in 0:3
            fill!(cnt, 0)
            base = p*15
            for k in 1:15
                card = deck[base+k]
                if card < 4
                    cnt[card+1] += 1
                end
            end
            mask = 0
            for s in 0:3
                if cnt[s+1] == 0
                    mask |= 1 << s
                end
            end
            umask |= mask
            c[count_ones(mask)+1] += 1
        end
        if umask == 15 && c[3] == 1 && c[2] == 2 && c[1] == 1
            hits += 1
        end
    end
    return hits / nsim
end

# Calcul des probabilites exactes.
p78 = P_2110((14,14,14,14,22))
p77 = P_2110((13,14,14,14,22))
@printf("P(E)      = %.6e\n", p78)
@printf("P(E | S)  = %.6e\n", p77)
@printf("P(E et S) = %.6e\n", p77/21)
