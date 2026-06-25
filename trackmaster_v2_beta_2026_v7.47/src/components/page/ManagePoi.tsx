import { useEffect, useState } from "react";
import ManagePoiTable from "./ManagePoiTable";
import { API_BASE_URL } from "@/config/Api";
import type { Poi } from "@/data/poiData";

const ManagePoi = () => {
  const [pois, setPois] = useState<Poi[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const loadPois = async (
    currentPage = page,
    currentRows = rowsPerPage,
    search = searchTerm
  ) => {
    try {
      const authData = JSON.parse(
        localStorage.getItem("trackmaster-auth") || "{}"
      );

      const custId = authData?.custId || 0;

      const response = await fetch(
        `${API_BASE_URL}/Geofence/ManagePoi?iDisplayStart=${
          currentPage * currentRows
        }&iDisplayLength=${currentRows}&CustId=${custId}&sSearch=${search}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      console.log("Manage POI API:", result);

      if (result.success) {
        const mappedPois: Poi[] = result.data.data.map((item: any) => ({
        id: item.id,
        poiName: item.poiName,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        radius: Number(item.radius),
      }));

        setPois(mappedPois);
        setTotalCount(result.data.itemCount || 0);
      }
    } catch (error) {
      console.error("Error loading POIs:", error);
    }
  };

  useEffect(() => {
    loadPois();
  }, []);

  useEffect(() => {
    loadPois(page, rowsPerPage, searchTerm);
  }, [page, rowsPerPage, searchTerm]);

  return (
    <ManagePoiTable
      pois={pois}
      totalCount={totalCount}
      page={page}
      rowsPerPage={rowsPerPage}
      onPageChange={setPage}
      onRowsPerPageChange={(size) => {
        setRowsPerPage(size);
        setPage(0);
      }}
      onSearch={(value) => {
        setSearchTerm(value);
        setPage(0);
      }}
      onUpdatePois={setPois}
    />
  );
};

export default ManagePoi;