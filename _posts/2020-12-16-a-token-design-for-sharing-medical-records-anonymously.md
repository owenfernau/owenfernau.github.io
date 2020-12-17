---
layout: post
title: "A System For Anonymous Medical Record "
date: 2020-12-16
---
_I wrote this for UC Berkeley's Blockchain Fundamentals course on EdX in 2018._

MedRec Coin is a blockchain platform which will allow people to share medical records while maintaining privacy. It will break open the data silos of hospitals while allowing patients remain anonymous. Patients who opt into the system will be paid in the platforms native token MedRec coin. They will be paid by researchers in both public and private institutions, and potentially even individuals, allowing for medical science to progress much more rapidly.

As an effort to bootstrap network effects we will airdrop tokens to the hospitals after partnering with them. This will incentivize them to integrate the potential for patients to opt-in to the program  The incentive will come from the potential for increasing demand of these tokens if researchers find the MedRec Coin protocol to be an effective way to access data and medical records in unprecedented numbers.

MedRec Coin will use a Federated Byzantine Consensus Agreement for a consensus mechanism. Hospitals will run nodes. This is similar to how the banks run the nodes for the Ripple project. FBA was chosen because the  MedRec protocol has obvious institutions which will be incentivized to uphold the dependability of the network. Why? Because they will be rewarded with tokens in signing up to be a validator. If the network is robust, and demand for the token rises, the hospitals will make money. The MedRec protocol is not similar to Bitcoin in the it is industry specific. Also FBA will provide fast transaction speeds and low transaction costs which will make the protocol more appealing.

As an aside the implementation will allow the validator nodes, which will be hospitals, to choose their own quorum slices. This will increase the trust of the MedRec protocol.

Unlike Ripple however MedRec's protocol will need to enforce privacy. Individuals privacy is a significant value proposition of this project. Pathshuffle is a protocol which is compatible with FBA. Pathshuffle is a combination of PathJoin and DiceMix, a peer-to-peer mixing protocol. This will help make transactions private so researchers paying hospitals and hospitals paying patients will not be transparent. This will increase trust in the system and the information lost in obfuscating these transfers does not seem to be as important has enforcing privacy.

Also however, patients' medical records will need to be encrypted when they are sent to paying researchers. While the MedRec team has not yet done the research necessary to see how this can be done, we have seen projects such as Numerai implementing a similar solution in encrypting stock market data so their network of data scientists do not actually know what information they are analyzing pertains to, however, they participate in the network nonetheless.

Obviously MedRec needs a slightly different, and potentially simpler encryption scheme. Researchers cannot lose the specific information of the disease, its results, and potentially other background information regarding the patient. The information we provide to researchers needs to be optimized between the constraints of patient's desired level of privacy and also the needs of researchers. This balance will be struck, with the possibility of allowing for different tiers of patient information supplied, with a corresponding increase in payout in the MedRec token for those patients willing to give up more privacy.

As for regulation the MediRec team anticipates that the platform's native token may be deemed a security even if it were airdropped. In light of this we may issue the MediRec token using a security token protocol. While expensive, this will increase investor confidence and token liquidity.

It's unlikely that there will be any KYC/AML issues because we will centralize ID issuance to hospital validators. So It won't be a permissionless network. But that seems best given the sensitive nature of the platform data.
