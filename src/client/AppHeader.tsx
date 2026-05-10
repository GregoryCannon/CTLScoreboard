import {
  Link
} from "react-router-dom";

import {
  getApiUrl
} from "./util.ts";

type AppHeaderProps = {
  discordIdentity: string;
  privilegeLevel: string;
  logOutOfDiscord: () => void;
  saveImage: () => void;
  isEditingPenaltyPoints: boolean;
  flipPenEdit: () => void;
}

import "./AppHeader.css";

function AppHeader(props: AppHeaderProps) {

  return (
    <div className="App-header">
     <div className="Header-nav">
       {/* Log in/out button */}
       {props.discordIdentity ? (
         <button className="Nav-button" onClick={props.logOutOfDiscord}>
           Log out
         </button>
       ) : (
         <a
           className="Nav-button"
           href={getApiUrl("discord-api/login")}
         >
           Log in with Discord
         </a>
       )}

       {/* Save standings button (admin-only) */}
       <button
         style={{ visibility: props.privilegeLevel === "Admin" ? "visible" : "hidden" }}
         className="Nav-button"
         onClick={props.saveImage}
       >
         Export standings to images
       </button>

       {/* Assign penalty points button (admin-only) */}
       <button
         style={{ visibility: props.privilegeLevel === "Admin" ? "visible" : "hidden" }}
         className="Nav-button"
         onClick={props.flipPenEdit}
       >
         {props.isEditingPenaltyPoints
           ? "Finish editing penalty points"
           : "Edit penalty points"}
       </button>
     </div>

     <div className="Discord-status-text">
       {props.discordIdentity ? (
         <div>
           Logged in as {props.discordIdentity} (
           {props.privilegeLevel})
         </div>
       ) : (
         ""
       )}
     </div>

     <h1>CTL Standings</h1>

     <div className="Content-nav">
       <Link className="Nav-button" to="/standings">
         Standings
       </Link>

       <Link className="Nav-button" to="/results">
         Results
       </Link>

       <Link className="Nav-button" to="/about">
         About
       </Link>
     </div>
    </div>
  )
}

export default AppHeader;
