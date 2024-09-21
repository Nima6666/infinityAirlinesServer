const PackageModel = require("./model/package");

const mongoose = require("mongoose");

const packages = [
  {
    service_name: "Global Explorer",
    price: 1200,
    package_details: "Round-trip to any destination in Europe",
  },
  {
    service_name: "Asia Adventure",
    price: 950,

    package_details: "Round-trip to top Asian destinations",
  },
  {
    service_name: "Luxury Caribbean",
    price: 2500,

    package_details: "First-class trip to Caribbean islands with resort stay",
  },
  {
    service_name: "South American Escape",
    price: 1350,

    package_details: "Round-trip to South America, including guided tours",
  },
  {
    service_name: "African Safari",
    price: 3000,

    package_details: "Luxury African safari trip with premium accommodations",
  },
  {
    service_name: "Australia & New Zealand Adventure",
    price: 2200,

    package_details:
      "Round-trip package with options to visit both Australia and New Zealand",
  },
  {
    service_name: "Middle East Explorer",
    price: 1800,

    package_details:
      "Round-trip to Middle Eastern countries with city tours included",
  },
  {
    service_name: "Ultimate World Tour",
    price: 5000,

    package_details:
      "Multi-country trip covering Europe, Asia, and North America",
  },
];

mongoose
  .connect("mongodb+srv://nima:2367@cluster0.qmmq6cq.mongodb.net/assignmentME")
  .then(() => {
    console.log("Connected to Database");
    packages.forEach(async (pkg) => {
      const newPackage = new PackageModel({
        service_name: pkg.service_name,
        price: pkg.price,
        package_details: pkg.package_details,
      });
      await newPackage
        .save()
        .then(console.log(`${newPackage.service_name} saved on database.`));
    });
  });
