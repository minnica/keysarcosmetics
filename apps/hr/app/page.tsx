import { chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import RolesClient from "./roles-client";
export const dynamic = "force-dynamic";
export default async function Home(){
  const user=await getChatGPTUser();
  return <RolesClient signOut={user?chatGPTSignOutPath("/"):""} />;
}
