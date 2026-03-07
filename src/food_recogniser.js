import { ChatOllama } from "@langchain/ollama";
import { SystemMessage, HumanMessage } from "langchain";
import * as z from "zod/v4";

const outputSchema = z.array(z.object({
  name: z.string().describe("Name of food/drink item"),
  type: z.string().describe("either food or drink"),
  quantity: z.string().describe("estimated quantity of that food/drink"),
}));

const systemPrompt = new SystemMessage(
  "You are a help food recogniser. Recognise food/drink items in the image. For quantity strictly adhere to answer in terms of number an estimate number of gram or ml is also fine",
);

const createImgMessage = (imgFile) =>
  new HumanMessage({
    content: [
      {
        type: "image_url",
        image_url: `data:image/jpeg;base64,${imgFile.toString("base64")}`,
      },
    ],
  });

export const createFoodRecogniser = () => {
  const llm = new ChatOllama({
    model: "gemma3",
    temperature: 0,
  }).withStructuredOutput(outputSchema);

  return (imgFile) =>
    llm.invoke([
      systemPrompt,
      createImgMessage(imgFile),
    ])
      .then((items) => ({ success: true, items }))
      .catch((error) => ({ success: false, items: [], error }));
};
