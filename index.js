const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

app.post('/bfhl', (req, res) => {
    const { data } = req.body;
    
    const response = {
        user_id: "Surya_12122005",
        email_id: "vp0549@srmist.edu.in",
        college_roll_number: "RA2311026010577",
        hierarchies: [],
        invalid_entries: [],
        duplicate_edges: [],
        summary: { total_trees: 0, total_cycles: 0, largest_tree_root: "" }
    };

    if (!data || !Array.isArray(data)) return res.status(400).json({ error: "Invalid data" });

    const filteredLinks = [];
    const edgehistory = new Set();
    const childrenToParents = {};
    const allNodes = new Set();

    data.forEach(entry => {
        const trimmed = entry.toString().trim(); 
        const match = trimmed.match(/^([A-Z])->([A-Z])$/); 

        if (!match || match[1] === match[2]) { 
            response.invalid_entries.push(trimmed);
        } else {
            const edge = `${match[1]}->${match[2]}`;
            if (edgehistory.has(edge)) {
                if (!response.duplicate_edges.includes(edge)) response.duplicate_edges.push(edge); 
            } else {
                edgehistory.add(edge);
                filteredLinks.push({ p: match[1], c: match[2] });
                allNodes.add(match[1]);
                allNodes.add(match[2]);
            }
        }
    });

    const relationmap = {};
    filteredLinks.forEach(({ p, c }) => {
        if (!childrenToParents[c]) { 
            childrenToParents[c] = p;
            relationmap[p] = relationmap[p] || [];
            relationmap[p].push(c);
        }
    });

    const visitedNodes = new Set();
    allNodes.forEach(node => {
        if (!visitedNodes.has(node)) {
            // Group connected nodes
            const group = new Set();
            const queue = [node];
            while(queue.length) {
                const n = queue.shift();
                if(!group.has(n)) {
                    group.add(n);
                    filteredLinks.forEach(e => {
                        if(e.p === n) queue.push(e.c);
                        if(e.c === n) queue.push(e.p);
                    });
                }
            }
            group.forEach(n => visitedNodes.add(n));

            
            let rootCandidates = [...group].filter(n => !childrenToParents[n]);
            let root = rootCandidates.length > 0 ? rootCandidates.sort()[0] : [...group].sort()[0]; 

            let isCycle = false;
            const build = (curr, path = new Set()) => {
                if (path.has(curr)) { isCycle = true; return {}; }
                path.add(curr);
                const tree = {};
                (relationmap[curr] || []).forEach(child => {
                    tree[child] = build(child, new Set(path));
                });
                return tree;
            };

            const structure = build(root);
            const getDepth = (t) => {
                const keys = Object.keys(t);
                return keys.length === 0 ? 1 : 1 + Math.max(...keys.map(k => getDepth(t[k])));
            };

            const obj = { root, tree: isCycle ? {} : { [root]: structure } };
            if (isCycle) {
                obj.has_cycle = true;
                response.summary.total_cycles++;
            } else {
                obj.depth = getDepth(structure);
                response.summary.total_trees++;
            }
            response.hierarchies.push(obj);
        }
    });

    
    const treesOnly = response.hierarchies.filter(h => !h.has_cycle);
    if (treesOnly.length) {
        response.summary.largest_tree_root = treesOnly.sort((a,b) => b.depth - a.depth || a.root.localeCompare(b.root))[0].root;
    }

    res.json(response);
});

app.listen(process.env.PORT || 3000);
