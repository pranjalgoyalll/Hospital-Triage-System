#include "httplib.h"
#include "json.hpp"
#include <iostream>
#include <vector>
#include <queue>
#include <string>
#include <chrono>
#include <random>

using json = nlohmann::json;

// --- Mock Data Utilities ---
std::vector<std::string> firstNames = {"John", "Jane", "Rahul", "Priya", "Amit", "Sneha", "Michael", "Sarah", "Emily", "David"};
std::vector<std::string> lastNames = {"Doe", "Smith", "Sharma", "Singh", "Gupta", "Williams", "Brown", "Jones", "Miller", "Davis"};
std::vector<std::string> symptomsList = {"Fever", "Chest Pain", "Headache", "Bleeding", "Fracture", "Nausea", "Stroke", "Breathing Difficulty"};
std::vector<std::string> bloodGroups = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"};

std::random_device rd;
std::mt19937 gen(rd());

std::string generateRandomID(const std::string& prefix) {
    std::uniform_int_distribution<> dist(10000, 99999);
    return prefix + std::to_string(dist(gen));
}

// --- Triage Logic ---
struct Patient {
    std::string patientID;
    std::string name;
    int age;
    std::string gender;
    std::string bloodGroup;
    std::string symptoms;
    long long arrivalTime;
    int severityLevel;
    std::string requiredDepartment;
    std::string currentStatus;
    int priorityScore;

    Patient(std::string id, std::string n, int a, std::string g, std::string bg, std::string sym, int sev, std::string reqDept)
        : patientID(id), name(n), age(a), gender(g), bloodGroup(bg), symptoms(sym), severityLevel(sev), requiredDepartment(reqDept) {
        
        auto now = std::chrono::system_clock::now();
        arrivalTime = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
        currentStatus = "WAITING";
        
        priorityScore = severityLevel;
        if (age > 65) priorityScore += 5;
        else if (age < 12) priorityScore += 3;
    }

    json toJson() const {
        return json{
            {"patientID", patientID},
            {"name", name},
            {"age", age},
            {"gender", gender},
            {"bloodGroup", bloodGroup},
            {"symptoms", symptoms},
            {"arrivalTime", arrivalTime},
            {"severityLevel", severityLevel},
            {"requiredDepartment", requiredDepartment},
            {"currentStatus", currentStatus},
            {"priorityScore", priorityScore}
        };
    }
};

struct PatientCompare {
    bool operator()(const Patient& a, const Patient& b) const {
        if (a.priorityScore != b.priorityScore) {
            return a.priorityScore < b.priorityScore; // Higher score = higher priority
        }
        return a.arrivalTime > b.arrivalTime; // Earlier arrival = higher priority
    }
};

Patient generateMockPatient() {
    std::uniform_int_distribution<> nameDist(0, 9);
    std::uniform_int_distribution<> ageDist(5, 84);
    std::uniform_int_distribution<> genderDist(0, 1);
    std::uniform_int_distribution<> bgDist(0, 7);
    std::uniform_int_distribution<> symDist(0, 7);
    std::uniform_real_distribution<> sevDist(0, 100);

    double s = sevDist(gen);
    int sev = 20; // LOW
    if (s > 85) sev = 100; // CRITICAL
    else if (s > 60) sev = 80; // HIGH
    else if (s > 30) sev = 50; // MEDIUM

    return Patient(
        generateRandomID("PAT-"),
        firstNames[nameDist(gen)] + " " + lastNames[nameDist(gen)],
        ageDist(gen),
        genderDist(gen) == 0 ? "Male" : "Female",
        bloodGroups[bgDist(gen)],
        symptomsList[symDist(gen)],
        sev,
        "General"
    );
}

// --- Global State ---
std::priority_queue<Patient, std::vector<Patient>, PatientCompare> triageQueue;

struct Doctor {
    std::string id;
    std::string name;
    std::string dept;
    bool available;
    
    json toJson() const {
        return json{{"id", id}, {"name", name}, {"dept", dept}, {"available", available}};
    }
};

struct Ward {
    std::string id;
    std::string type;
    int beds;
    
    json toJson() const {
        return json{{"id", id}, {"type", type}, {"beds", beds}};
    }
};

std::vector<Doctor> doctors = {
    {"DOC-01", "Dr. Smith", "General", true},
    {"DOC-02", "Dr. Jones", "Cardiology", true},
    {"DOC-03", "Dr. Sharma", "Neurology", true}
};

std::vector<Ward> wards = {
    {"W-01", "General", 20},
    {"ICU-01", "ICU", 10}
};

int stats_treated = 0;

// Helper to dump queue state
json getState() {
    // Copy queue to iterate
    auto q = triageQueue;
    json queueJson = json::array();
    int criticalCount = 0;
    while (!q.empty()) {
        const auto& p = q.top();
        queueJson.push_back(p.toJson());
        if (p.severityLevel == 100) criticalCount++;
        q.pop();
    }

    json docJson = json::array();
    for (const auto& d : doctors) docJson.push_back(d.toJson());

    json wardJson = json::array();
    for (const auto& w : wards) wardJson.push_back(w.toJson());

    return json{
        {"queue", queueJson},
        {"stats", {
            {"waiting", queueJson.size()},
            {"treated", stats_treated},
            {"critical", criticalCount},
            {"bedsAvailable", 30}
        }},
        {"doctors", docJson},
        {"wards", wardJson}
    };
}

int main(void) {
    httplib::Server svr;

    // Serve static files from the 'public' directory
    if (!svr.set_mount_point("/", "./public")) {
        std::cerr << "Failed to mount public directory." << std::endl;
        return 1;
    }

    // API: Get State
    svr.Get("/api/state", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(getState().dump(), "application/json");
    });

    // API: Simulate Patients
    svr.Post("/api/simulate", [](const httplib::Request&, httplib::Response& res) {
        std::uniform_int_distribution<> numDist(1, 3);
        int num = numDist(gen);
        for (int i = 0; i < num; ++i) {
            triageQueue.push(generateMockPatient());
        }
        res.set_content(getState().dump(), "application/json");
    });

    // API: Process Next Unit
    svr.Post("/api/process", [](const httplib::Request&, httplib::Response& res) {
        if (!triageQueue.empty()) {
            bool doctorFound = false;
            for (auto& doc : doctors) {
                if (doc.available) {
                    doc.available = false;
                    doctorFound = true;
                    break;
                }
            }
            if (doctorFound) {
                triageQueue.pop(); // Remove patient
            }
        }
        res.set_content(getState().dump(), "application/json");
    });

    // API: Discharge
    svr.Post("/api/discharge", [](const httplib::Request&, httplib::Response& res) {
        for (auto& doc : doctors) {
            if (!doc.available) {
                doc.available = true; // Free up doctor
                stats_treated++;
                break;
            }
        }
        res.set_content(getState().dump(), "application/json");
    });

    int port = 8080;
    if (const char* env_p = std::getenv("PORT")) {
        port = std::stoi(env_p);
    }

    std::cout << "Starting C++ Server on 0.0.0.0:" << port << std::endl;
    svr.listen("0.0.0.0", port);

    return 0;
}
