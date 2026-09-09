# Hospital-Triage-System
A C++ web server application designed to simulate a hospital emergency room triage system. This backend manages patient registration, priority queuing, and doctor assignments, serving a web frontend via REST APIs.

🏥 Features

Patient Simulation: Rapidly generate random mock patients with varying severity levels (Low, Medium, High, Critical).
Severity Triage: Assigns a priority score to patients based on their medical severity and age (e.g., higher priority for seniors > 65 and children < 12).
Priority-Based Queueing: Uses a std::priority_queue to automatically sort patients so that the most critical are treated first. Ties in priority are resolved by arrival time.
Doctor & Ward Management: Simulates doctors taking on patients and discharging them, keeping track of availability and treatment statistics.
REST API: Exposes endpoints to control the simulation and fetch real-time state for a web frontend.

🛠️ Technologies & Dependencies

Language: C++11 (or later)
Web Server: cpp-httplib (Single-header HTTP server)
JSON Serialization: nlohmann/json (JSON for Modern C++)
Data Structures: std::priority_queue, std::vector, std::string
