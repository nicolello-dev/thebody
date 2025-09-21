import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router";
import { Index } from "./routes/index";
import { Inventory } from "./routes/inventory";
import { Database } from "./routes/database";
import { Crafting } from "./routes/crafting";
import { Map } from "./routes/map";
import { User } from "./routes/user";

const root = document.getElementById("root");

createRoot(root!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />}></Route>
        <Route path="/inventory" element={<Inventory />}></Route>
        <Route path="/database" element={<Database />}></Route>
        <Route path="/crafting" element={<Crafting />}></Route>
        <Route path="/map" element={<Map />}></Route>
        <Route path="/user" element={<User />}></Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
