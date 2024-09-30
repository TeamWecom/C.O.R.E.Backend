import db from "../managers/databaseSequelize.js";

export const getLatestTemperatureByDevEUI = async (devEUI) => {
  try {
    var result = await db.iotDevicesHistory.findOne({
      where: {
        deveui: devEUI,
      },
      order: [["id", "DESC"]],
      attributes: ["temperature"],
      raw: true,
    });

    if (result) {
      return result.temperature; 
    }
    return null;
  } catch (error) {
    console.error("Erro ao consultar a temperatura:", error);
    throw new Error("Erro ao consultar a temperatura.");
  }
};
