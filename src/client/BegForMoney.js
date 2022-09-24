import React from "react";

const BegForMoney = props => {
  const paypalUrl =
    "https://www.paypal.com/donate/?business=TSZ53TZJ35PQC&no_recurring=0&item_name=Hosting+online+tools+for+the+good+folks+of+the+Tetris+community.&currency_code=USD";
  return (
    <React.Fragment>
      Want to help support this tool? Donate <a href={paypalUrl}>here</a>!
    </React.Fragment>
  );
};

export default BegForMoney;