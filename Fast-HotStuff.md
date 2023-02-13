The pseudocode below serves as our specification for the implementation of pipelined Fast-HotStuff based on https://arxiv.org/pdf/2010.11454.pdf. 

Types
----
A ```block``` has the following fields:
+ ```parent```
+ ```view```
+ ```qc```
+ ```agg_qc```
+ ```signature```
+ ```transactions```

A ```vote``` has the following fields:
+ ```block```
+ ```signer```
+ ```signature```

A ```new_view``` message has the following fields:
+ ```view```
+ ```high_qc```
+ ```signer```
+ ```signature```

A ```qc``` has the following fields:
+ ```block```
+ ```signers```
+ ```signature```

An ```agg_qc``` has the following fields:
+ ```view```
+ ```qcs```
+ ```signers```
+ ```signature```

Variables
----
Every node keeps track of its local
+ ```cur_view```
+ ```high_qc```
+ ```final_block```

Prerequisites
----
The functions defined in the next section rely on primitives we do not specify in detail for the sake of brevity: 
+ ```leader(view)``` returns the leader of the view
+ ```supermajority(signers)``` returns whether the signers represent the supermajority
+ ```reset()``` restarts the timer which calls timeout when it expires
+ ```download(hash)``` and ```download(view)``` fetches a missing block from peer nodes
+ ```extends(block, ancestor)``` returns whether there is a chain between the block and the ancestor
+ ```commit(ancestor, block)``` commits the descendants of ancestor along the chain to the block
+ ```sign(message)``` creates a bls signature on the message using the node's private key
+ ```aggregate(signatures)``` aggregates the bls signatures and returns the resulting signature
+ ```verify(message, signature, signers)``` verifies if the (aggregated) bls signature on the message corresponds to the public key(s) of the signer(s)
+ ```batch_verify(messages, signature, signers)``` batch verifies if the aggregated bls signature on the messages corresponds to the public key of the signers

Functions
----
The following pseudocode specifies the core functionality of correct nodes. To ease legibility, we deviate from the Python syntax to some extent.

```python
def safe(block):
	if block.qc != None:
		return block.view >= cur_view and block.view == block.qc.block.view + 1
	elif block.agg_qc != None:
		return block.view >= cur_view and extends(block, block.agg_qc.high_qc.block)

def try_commit(block):
	parent = block.qc.block
	grandparent = parent.qc.block
	if parent.view == grandparent.view + 1:
		return grandparent

def adjust_high_qc_and_view(qc, agg_qc):
	if qc != None:
		if qc.block.view > high_qc.block.view:
			high_qc = qc
		if qc.block.view > cur_view: # download the blocks of the missed views
			while cur_view++ <= qc.block.view: download(cur_view) 
			reset()
	elif agg_qc != None:
		if agg_qc.high_qc.block.view != high_qc.block.view:
			high_qc = agg_qc.high_qc # release the lock and adopt the lock of the supermajority
		if agg_qc.high_qc.block.view > cur_view: # download the blocks of the missed views
			while cur_view++ <= agg_qc.high_qc.block.view: download(cur_view)
			reset()

def receive(block):
	if block.hash already stored: return
	if block.view <= final_block.view: return # equivocation
	if block.parent missing: download(block.parent)
	elif !extends(block, final_block): return # trace back along the chain to detect the block where equivocation happened
	if !verify(block.hash, block.signature, leader(block.view)): return
	if block.qc != None:
		if !verify(block.qc, block.qc.signature, block.qc.signers): return
	if block.agg_qc != None:
		if !batch_verify((block.agg_qc.signers[i], block.agg_qc.view, block.agg_qc.qcs[i]) for i in 0..len(block.agg_qc.signers), block.agg_qc.signature, block.agg_qc.signers): return
		block.agg_qc.high_qc = qc in block.agg_qc.qcs such that qc.block.view == max(all.block.view of all in block.agg_qc.qcs)
		if !verify(block.agg_qc.high_qc, block.agg_qc.high_qc.signature, block.agg_qc.high_qc.signers): return
	store block
	adjust_high_qc_and_view(block.qc, block.agg_qc)
	if safe(block):
		if block.view > cur_view: # download the blocks of the missed views
			while cur_view++ < block.view: download(cur_view) 
		vote.signer = node_index
		vote.block = block.hash
		vote.signature = sign(block.hash)
		send vote to leader(cur_view++)
		reset()
		grandparent = try_commit(block)
		if grandparent != None: 
			commit(final_block, grandparent)
			some_block = grandparent
			while some_block.view > final_block.view:
				view = some_block.view
				while view > some_block.parent.view
					delete block(view--)
				some_block = some_block.parent
			final_block = grandparent
	else timeout()

def receive(vote):
	if vote.block missing: download(vote.block) # download the missing block based on its hash
	if node_index != leader(vote.block.view + 1): return # the vote must be sent to someone else
	if vote.block.view < cur_view - 1: return # the vote arrived too late, the vote doesn't count anymore
	if !verify(vote.block, vote.signature, vote.signer): return
	collection[vote.block].append(vote.signature, vote.signer)
	if supermajority([all.signer for all in collection[vote.block]]):
		if vote.block.view > cur_view: # download the blocks of the missed views
			while cur_view++ < vote.block.view: download(cur_view) 
			cur_view = vote.block.view + 1 # supermajority has voted for vote.block and advanced to vote.block.view + 1
			reset()
		if cur_view == vote.block.view + 1:
			high_qc.signature = aggregate([all.signature for all in collection[vote.block]])
			high_qc.signers = [all.signer for all in collection[vote.block]]
			high_qc.block = vote.block
			block.parent = vote.block
			block.view = cur_view
			block.qc = high_qc
			block.agg_qc = None
			compute block.hash
			block.signature = sign(block.hash)
			broadcast block

def receive(new_view):
	if new_view.high_qc.block missing: download(new_view.high_qc.block) # download the missing block based on its hash
	adjust_high_qc_and_view(new_view.high_qc, None)
	if node_index != leader(new_view.view): return # the message must be sent to someone else
	if new_view.view < cur_view: return # the message arrived too late, it doesn't count anymore
	if !verify((new_view.signer, new_view.view, new_view.high_qc), new_view.signature, new_view.signer): return
	collection.[new_view.view].append(new_view.signature, new_view.signer, new_view.high_qc)
	if supermajority([all.signer for all in collection[new_view.view]]):
		if new_view.view > cur_view: # download the blocks of the missed views
			while cur_view++ < new_view.view: download(cur_view) # supermajority has sent a new view message and advanced to new_view.view
			reset()
		if cur_view == new_view.view:
			block.agg_qc.view = new_view.view
			block.agg_qc.signature = aggregate([all.signature for all in collection[new_view.view]])
			block.agg_qc.signers = [all.signer for all in collection[new_view.view]]
			block.agg_qc.qcs = [all.high_qc for all in collection[new_view.view]]
			block.parent = block.agg_qc.high_qc.block
			block.view = cur_view
			block.qc = None
			compute block.hash
			block.signature = sign(block.hash)
			broadcast block

def timeout(): # called automatically when the timer expires
	cur_view++
	reset()
	new_view.signer = node_index
	new_view.view = cur_view
	new_view.high_qc = high_qc
	new_view.signature = sign((node_index, cur_view, high_qc))
	send new_view to leader(cur_view)
```
